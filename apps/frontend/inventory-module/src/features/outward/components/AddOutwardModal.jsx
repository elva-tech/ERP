import LineItemsEditor from "../../../components/ui/LineItemsEditor.jsx";
import Modal from "../../../components/ui/Modal.jsx";
import ModalForm from "../../../components/ui/ModalForm.jsx";
import { SelectField, TextAreaField, TextField } from "../../../components/ui/FormFields.jsx";
import { useFormSubmission } from "../../../hooks/useFormSubmission.js";
import { isBlank, isPositiveDecimal } from "../../../lib/validation.js";
import { outwardService } from "../services/outwardService.js";

const ID_PREFIX = "outward";
const EMPTY_LINE = { itemId: "", quantity: "", remarks: "" };

const PURPOSE_OPTIONS = ["Project Issue", "Site Issue", "Sales", "Transfer", "Return", "Scrap"].map((value) => ({
  value,
  label: value,
}));

const AUTHORITY_OPTIONS = [
  "Mr. Suresh Patil (Chief Store Keeper)",
  "Mr. Rajesh Kulkarni (Warehouse Manager)",
  "Mr. Pramod Deshmukh (Site Engineer)",
].map((value) => ({ value, label: value }));

function buildItemOptions(items) {
  return items.map((item) => ({
    value: item.id,
    label: `${item.itemCode} • ${item.itemName}`,
  }));
}

function validate(values) {
  const errors = {};
  if (isBlank(values.purpose)) errors.purpose = "Select a purpose.";
  if (isBlank(values.warehouseId)) errors.warehouseId = "Select a warehouse.";
  if (isBlank(values.date)) errors.date = "Enter the dispatch date.";
  if (isBlank(values.destination)) errors.destination = "Destination or recipient is required.";

  values.lineItems.forEach((line, index) => {
    if (isBlank(line.itemId)) errors[`lineItems.${index}.itemId`] = "Select an item.";
    if (isBlank(line.quantity)) errors[`lineItems.${index}.quantity`] = "Enter quantity.";
    else if (!isPositiveDecimal(line.quantity)) errors[`lineItems.${index}.quantity`] = "Quantity must be greater than zero.";
  });

  return errors;
}

function AddOutwardModal({ isOpen, onClose, onCreated, warehouses = [], items = [] }) {
  const itemOptions = buildItemOptions(items);
  const warehouseOptions = warehouses.map((w) => ({ value: w.id, label: w.name }));
  const defaultWarehouse = warehouses[0]?.id ?? "";
  const defaultItem = items[0]?.id ?? "";

  const unitForLine = (line) => items.find((item) => item.id === line.itemId)?.unit ?? "—";

  const form = useFormSubmission({
    initialValues: {
      purpose: "Project Issue",
      warehouseId: defaultWarehouse,
      date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      destination: "",
      authorization: AUTHORITY_OPTIONS[0].value,
      remarks: "",
      lineItems: [{ ...EMPTY_LINE, itemId: defaultItem, quantity: "50", remarks: "Site installation" }],
    },
    validate,
    submit: async (values, context) => {
      const payload = {
        purpose: values.purpose,
        destination: values.destination.trim(),
        warehouseId: values.warehouseId,
        date: values.date,
        authorization: values.authorization,
        remarks: values.remarks,
        status: "Dispatched",
        lineItems: values.lineItems.map((line) => ({
          itemId: line.itemId,
          quantity: Number(line.quantity),
          remarks: line.remarks,
        })),
      };
      return outwardService.createOutward(payload, context);
    },
    onSuccess: (result) => onCreated?.(result?.data ?? result),
  });

  const field = { form, idPrefix: ID_PREFIX };
  const itemLookup = { options: itemOptions, status: "success" };

  if (!isOpen) return null;

  return (
    <Modal title="Add New Outward" description="Record a new stock dispatch." width="xl" onClose={onClose}>
      <ModalForm
        onSubmit={form.handleSubmit}
        onCancel={onClose}
        submitLabel="Submit Outward"
        isSubmitting={form.isSubmitting}
        formError={form.formError}
      >
        <div className="grid grid-cols-1 gap-x-3 gap-y-[11px] sm:grid-cols-2">
          <SelectField {...field} name="purpose" label="Purpose" options={PURPOSE_OPTIONS} required data-autofocus />
          <SelectField
            {...field}
            name="warehouseId"
            label="Warehouse"
            placeholder="Select warehouse"
            options={warehouseOptions}
            required
          />
          <TextField {...field} name="date" label="Date" required />
          <TextField
            {...field}
            name="destination"
            label="Destination / Recipient"
            placeholder="Enter customer, site or department"
            required
          />

          <div className="sm:col-span-2">
            <LineItemsEditor
              form={form}
              name="lineItems"
              idPrefix={ID_PREFIX}
              label="Line Items"
              emptyItem={{ ...EMPTY_LINE, itemId: defaultItem }}
              addLabel="Add row"
              columns={[
                {
                  key: "itemId",
                  label: "Item",
                  width: "minmax(0,1fr)",
                  kind: "select",
                  placeholder: "Select item",
                  lookup: itemLookup,
                },
                { key: "quantity", label: "Qty", width: "96px", kind: "quantity", placeholder: "0" },
                { key: "unit", label: "Unit", width: "80px", kind: "computed", compute: unitForLine },
                { key: "remarks", label: "Remarks", width: "minmax(0,1fr)", placeholder: "Add item note" },
              ]}
            />
          </div>

          <SelectField
            {...field}
            name="authorization"
            label="Authorization"
            options={AUTHORITY_OPTIONS}
            className="sm:col-span-2"
          />
          <TextAreaField
            {...field}
            name="remarks"
            label="Remarks"
            placeholder="Add dispatch notes"
            className="sm:col-span-2"
          />
        </div>
      </ModalForm>
    </Modal>
  );
}

export default AddOutwardModal;
