import { Info } from "lucide-react";
import LineItemsEditor from "../../../components/ui/LineItemsEditor.jsx";
import Modal from "../../../components/ui/Modal.jsx";
import ModalForm from "../../../components/ui/ModalForm.jsx";
import FormField from "../../../components/ui/FormField.jsx";
import { SelectField, TextAreaField, TextField } from "../../../components/ui/FormFields.jsx";
import { INPUT_CLASS } from "../../../components/ui/formStyles.js";
import { useFormSubmission } from "../../../hooks/useFormSubmission.js";
import { isBlank, isPositiveDecimal } from "../../../lib/validation.js";
import { inwardService } from "../services/inwardService.js";

const ID_PREFIX = "inward";
const EMPTY_LINE = { itemId: "", quantity: "", rate: "" };

function formatAmount(item) {
  const quantity = Number(item.quantity) || 0;
  const rate = Number(item.rate) || 0;
  if (!quantity || !rate) return "—";
  return `₹${(quantity * rate).toLocaleString("en-IN")}`;
}

function validate(values) {
  const errors = {};
  if (isBlank(values.supplier)) errors.supplier = "Supplier is required.";
  if (isBlank(values.warehouseId)) errors.warehouseId = "Select a warehouse.";
  if (isBlank(values.date)) errors.date = "Enter the receipt date.";

  values.lineItems.forEach((line, index) => {
    if (isBlank(line.itemId)) errors[`lineItems.${index}.itemId`] = "Select an item.";
    if (isBlank(line.quantity)) errors[`lineItems.${index}.quantity`] = "Enter quantity.";
    else if (!isPositiveDecimal(line.quantity)) errors[`lineItems.${index}.quantity`] = "Quantity must be greater than zero.";
    if (isBlank(line.rate)) errors[`lineItems.${index}.rate`] = "Enter rate.";
    else if (!isPositiveDecimal(line.rate)) errors[`lineItems.${index}.rate`] = "Rate must be greater than zero.";
  });

  return errors;
}

function buildItemOptions(items) {
  return items.map((item) => ({
    value: item.id,
    label: `${item.itemCode} • ${item.itemName}`,
  }));
}

function AddInwardModal({ isOpen, onClose, onCreated, warehouses = [], items = [] }) {
  const itemOptions = buildItemOptions(items);
  const warehouseOptions = warehouses.map((w) => ({ value: w.id, label: w.name }));
  const defaultWarehouse = warehouses[0]?.id ?? "";
  const defaultItem = items[0]?.id ?? "";

  const form = useFormSubmission({
    initialValues: {
      supplier: "",
      warehouseId: defaultWarehouse,
      date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      remarks: "",
      lineItems: [{ ...EMPTY_LINE, itemId: defaultItem, quantity: "100", rate: "250" }],
    },
    validate,
    submit: async (values, context) => {
      const payload = {
        supplier: values.supplier.trim(),
        warehouseId: values.warehouseId,
        date: values.date,
        remarks: values.remarks,
        status: "Received",
        lineItems: values.lineItems.map((line) => ({
          itemId: line.itemId,
          quantity: Number(line.quantity),
          rate: Number(line.rate),
        })),
      };
      return inwardService.createInward(payload, context);
    },
    onSuccess: (result) => onCreated?.(result?.data ?? result),
  });

  const field = { form, idPrefix: ID_PREFIX };
  const itemLookup = { options: itemOptions, status: "success" };

  if (!isOpen) return null;

  return (
    <Modal title="Add New Inward" description="Record a new goods inward entry." width="xl" onClose={onClose}>
      <ModalForm
        onSubmit={form.handleSubmit}
        onCancel={onClose}
        submitLabel="Submit Inward"
        isSubmitting={form.isSubmitting}
        formError={form.formError}
      >
        <div className="grid grid-cols-1 gap-x-3 gap-y-[11px] sm:grid-cols-2">
          <TextField
            {...field}
            name="supplier"
            label="Supplier"
            placeholder="Search or select supplier"
            required
            data-autofocus
          />
          <SelectField
            {...field}
            name="warehouseId"
            label="Warehouse"
            placeholder="Select warehouse"
            options={warehouseOptions}
            required
          />
          <TextField {...field} name="date" label="Date" required />
          <FormField label="GRN Number" htmlFor={`${ID_PREFIX}-grn-preview`}>
            <input
              id={`${ID_PREFIX}-grn-preview`}
              readOnly
              disabled
              value="GRN-2609-AUTO"
              className={`${INPUT_CLASS} cursor-not-allowed bg-workspace text-muted`}
            />
          </FormField>

          <div className="sm:col-span-2">
            <p
              role="status"
              className="flex items-start gap-2 rounded-md bg-info-soft px-3 py-2.5 text-[12px] leading-[17px] text-ink"
            >
              <Info size={15} className="mt-px shrink-0 text-info" aria-hidden="true" />
              GRN number will be generated automatically on submission.
            </p>
          </div>

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
                { key: "rate", label: "Rate", width: "110px", kind: "decimal", placeholder: "0" },
                { key: "amount", label: "Amount", width: "120px", kind: "computed", compute: formatAmount },
              ]}
            />
          </div>

          <TextAreaField
            {...field}
            name="remarks"
            label="Remarks"
            placeholder="Add delivery notes or PO reference"
            className="sm:col-span-2"
          />
        </div>
      </ModalForm>
    </Modal>
  );
}

export default AddInwardModal;
