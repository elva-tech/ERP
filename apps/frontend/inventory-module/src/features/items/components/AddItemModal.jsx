import Modal from "../../../components/ui/Modal.jsx";
import ModalForm from "../../../components/ui/ModalForm.jsx";
import { SelectField, TextAreaField, TextField } from "../../../components/ui/FormFields.jsx";
import { useFormSubmission } from "../../../hooks/useFormSubmission.js";
import { CreateItemInputSchema } from "../../../schemas/inventorySchemas.js";
import { itemService } from "../services/itemService.js";

const ID_PREFIX = "item";

const CATEGORY_OPTIONS = [
  { value: "Cables & Wires", label: "Cables & Wires" },
  { value: "Switchgear", label: "Switchgear" },
  { value: "Distribution Panels", label: "Distribution Panels" },
  { value: "Transformers", label: "Transformers" },
  { value: "Conduits", label: "Conduits" },
  { value: "Earthing", label: "Earthing" },
  { value: "Meters", label: "Meters" },
  { value: "Accessories", label: "Accessories" },
  { value: "Other", label: "Other" },
];

const UNIT_OPTIONS = ["Mtr", "Nos", "Pcs", "Kg", "Ltr", "Set", "Box"].map((unit) => ({
  value: unit,
  label: unit,
}));

const INITIAL_VALUES = {
  itemCode: "",
  itemName: "",
  category: "",
  hsnCode: "",
  unit: "Nos",
  reorderLevel: "",
  description: "",
  taxRate: "18",
};

function parsePayload(values) {
  return CreateItemInputSchema.safeParse({
    ...values,
    reorderLevel: values.reorderLevel === "" ? undefined : Number(values.reorderLevel),
    taxRate: values.taxRate === "" ? 18 : Number(values.taxRate),
  });
}

function validate(values) {
  const parsed = parsePayload(values);
  if (parsed.success) return {};
  const errors = {};
  for (const [key, messages] of Object.entries(parsed.error.flatten().fieldErrors)) {
    if (messages?.[0]) errors[key] = messages[0];
  }
  return errors;
}

function AddItemModal({ isOpen, onClose, onCreated }) {
  const form = useFormSubmission({
    initialValues: INITIAL_VALUES,
    validate,
    submit: async (values, context) => {
      const parsed = parsePayload(values);
      if (!parsed.success) {
        throw { kind: "validation", message: "Please review the highlighted fields." };
      }
      return itemService.createItem(parsed.data, context);
    },
    onSuccess: (result) => onCreated?.(result?.data ?? result),
  });
  const field = { form, idPrefix: ID_PREFIX };

  if (!isOpen) return null;

  return (
    <Modal title="Add Item" description="Add a new item to the inventory master." width="lg" onClose={onClose}>
      <ModalForm
        onSubmit={form.handleSubmit}
        onCancel={onClose}
        submitLabel="Add Item"
        isSubmitting={form.isSubmitting}
        formError={form.formError}
      >
        <div className="grid grid-cols-1 gap-x-3 gap-y-[11px] sm:grid-cols-2">
          <TextField
            {...field}
            name="itemCode"
            label="Item Code"
            placeholder="e.g. CBL-1.5-3C"
            required
            data-autofocus
            autoCapitalize="characters"
            spellCheck={false}
          />
          <TextField {...field} name="itemName" label="Item Name" placeholder="Enter item name" required />
          <SelectField
            {...field}
            name="category"
            label="Category"
            placeholder="Select category"
            options={CATEGORY_OPTIONS}
            required
          />
          <TextField {...field} name="hsnCode" label="HSN Code" placeholder="Enter HSN code" required spellCheck={false} />
          <SelectField {...field} name="unit" label="Unit of Measurement" options={UNIT_OPTIONS} required />
          <TextField
            {...field}
            name="reorderLevel"
            label="Reorder Level"
            placeholder="Enter minimum stock"
            required
            inputMode="numeric"
          />
          <TextField {...field} name="taxRate" label="Tax Rate %" placeholder="e.g. 18" inputMode="decimal" />
          <TextAreaField
            {...field}
            name="description"
            label="Description"
            placeholder="Add item specifications or notes"
            className="sm:col-span-2"
          />
        </div>
      </ModalForm>
    </Modal>
  );
}

export default AddItemModal;
