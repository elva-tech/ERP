import { useEffect, useRef, useState } from "react";
import Modal from "../../../components/ui/Modal.jsx";
import ModalForm from "../../../components/ui/ModalForm.jsx";
import FormField from "../../../components/ui/FormField.jsx";
import { SelectField, TextField } from "../../../components/ui/FormFields.jsx";
import { INPUT_CLASS } from "../../../components/ui/formStyles.js";
import { useFormSubmission } from "../../../hooks/useFormSubmission.js";
import { CreateWarehouseInputSchema } from "../../../schemas/inventorySchemas.js";
import { warehouseService } from "../services/warehouseService.js";

const ID_PREFIX = "warehouse";

const STATE_OPTIONS = [
  "Maharashtra",
  "Gujarat",
  "Karnataka",
  "Telangana",
  "Tamil Nadu",
  "Delhi",
  "Rajasthan",
  "Madhya Pradesh",
].map((state) => ({ value: state, label: state }));

const TYPE_OPTIONS = ["Main", "Yard", "Transit", "Project Site"].map((type) => ({
  value: type,
  label: type,
}));

const DOCUMENT_FIELD_ID = `${ID_PREFIX}-document`;
const PDF_FILE_ERROR = "Select a PDF file. Other file types are not allowed.";

function isPdfFile(file) {
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  if (type === "application/pdf" || type === "application/x-pdf") return true;
  if (!name.endsWith(".pdf")) return false;
  return type === "" || type === "application/octet-stream";
}

const INITIAL_VALUES = {
  name: "",
  code: "",
  streetAddress: "",
  city: "",
  state: "Maharashtra",
  pinCode: "",
  type: "Main",
  totalAreaSqFt: "",
  contactPerson: "",
  contactPhone: "",
};

function parsePayload(values) {
  return CreateWarehouseInputSchema.safeParse({
    ...values,
    totalAreaSqFt: values.totalAreaSqFt === "" ? undefined : Number(values.totalAreaSqFt),
    status: "Active",
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

function AddWarehouseModal({ isOpen, onClose, onCreated }) {
  const fileInputRef = useRef(null);
  // createWarehouse posts JSON, so the PDF is selected and validated here and is not saved.
  const [warehouseDocument, setWarehouseDocument] = useState(null);
  const [documentError, setDocumentError] = useState("");
  const form = useFormSubmission({
    initialValues: INITIAL_VALUES,
    validate,
    submit: async (values, context) => {
      const parsed = parsePayload(values);
      if (!parsed.success) {
        throw { kind: "validation", message: "Please review the highlighted fields." };
      }
      return warehouseService.createWarehouse(parsed.data, context);
    },
    onSuccess: (result) => onCreated?.(result?.data ?? result),
  });
  const field = { form, idPrefix: ID_PREFIX };

  useEffect(() => {
    if (isOpen) return;
    setWarehouseDocument(null);
    setDocumentError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [isOpen]);

  function clearWarehouseDocument() {
    setWarehouseDocument(null);
    setDocumentError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleDocumentChange(event) {
    const nextFile = event.target.files?.[0];
    event.target.value = "";
    if (!nextFile) return;
    if (!isPdfFile(nextFile)) {
      setWarehouseDocument(null);
      setDocumentError(PDF_FILE_ERROR);
      return;
    }
    setDocumentError("");
    setWarehouseDocument(nextFile);
  }

  function openDocumentPicker() {
    fileInputRef.current?.click();
  }

  if (!isOpen) return null;

  return (
    <Modal
      title="Add Warehouse"
      description="Create a new inventory storage location."
      width="xl"
      onClose={onClose}
    >
      <ModalForm
        onSubmit={form.handleSubmit}
        onCancel={onClose}
        submitLabel="Add Warehouse"
        isSubmitting={form.isSubmitting}
        formError={form.formError}
      >
        <div className="grid grid-cols-1 gap-x-3 gap-y-[11px] sm:grid-cols-2">
          <TextField {...field} name="name" label="Warehouse Name" placeholder="Enter warehouse name" required data-autofocus />
          <TextField
            {...field}
            name="code"
            label="Warehouse Code"
            placeholder="e.g. PUN-MAIN-01"
            required
            autoCapitalize="characters"
            spellCheck={false}
          />
          <TextField
            {...field}
            name="streetAddress"
            label="Street Address"
            placeholder="Building, street and area"
            required
            className="sm:col-span-2"
            autoComplete="street-address"
          />
          <TextField {...field} name="city" label="City" placeholder="Enter city" required autoComplete="address-level2" />
          <SelectField {...field} name="state" label="State" options={STATE_OPTIONS} required />
          <TextField {...field} name="pinCode" label="PIN Code" placeholder="6-digit PIN" required inputMode="numeric" maxLength={6} />
          <SelectField {...field} name="type" label="Warehouse Type" options={TYPE_OPTIONS} required />
          <TextField
            {...field}
            name="totalAreaSqFt"
            label="Total Area (sq ft)"
            placeholder="Enter total area"
            required
            inputMode="numeric"
          />
          <TextField {...field} name="contactPerson" label="Contact Person" placeholder="Full name" required autoComplete="name" />
          <TextField
            {...field}
            name="contactPhone"
            label="Contact Phone"
            type="tel"
            inputMode="tel"
            placeholder="+91 00000 00000"
            required
            autoComplete="tel"
          />
          <FormField label="Warehouse Document (PDF)" htmlFor={DOCUMENT_FIELD_ID} error={documentError}>
            <input
              ref={fileInputRef}
              id={DOCUMENT_FIELD_ID}
              type="file"
              accept="application/pdf,.pdf"
              tabIndex={-1}
              className="sr-only"
              aria-invalid={documentError ? true : undefined}
              aria-describedby={documentError ? `${DOCUMENT_FIELD_ID}-error` : undefined}
              onChange={handleDocumentChange}
            />
            {warehouseDocument ? (
              <div className={`${INPUT_CLASS} flex items-center gap-2 pr-2`} aria-invalid={documentError ? true : undefined}>
                <span className="min-w-0 flex-1 truncate text-ink" title={warehouseDocument.name}>
                  {warehouseDocument.name}
                </span>
                <button
                  type="button"
                  onClick={clearWarehouseDocument}
                  disabled={form.isSubmitting}
                  aria-label={`Remove ${warehouseDocument.name}`}
                  className="shrink-0 text-[12px] font-semibold text-muted hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Remove
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={openDocumentPicker}
                disabled={form.isSubmitting}
                aria-invalid={documentError ? true : undefined}
                aria-describedby={documentError ? `${DOCUMENT_FIELD_ID}-error` : undefined}
                className={`${INPUT_CLASS} text-left text-placeholder disabled:cursor-not-allowed`}
              >
                Choose PDF File
              </button>
            )}
          </FormField>
        </div>
      </ModalForm>
    </Modal>
  );
}

export default AddWarehouseModal;
