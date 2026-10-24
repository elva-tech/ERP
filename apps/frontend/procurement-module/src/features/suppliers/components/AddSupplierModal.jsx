import Modal from "../../../components/ui/Modal.jsx";
import ModalForm from "../../../components/ui/ModalForm.jsx";
import { SelectField, TextAreaField, TextField } from "../../../components/ui/FormFields.jsx";
import { useFormSubmission } from "../../../hooks/useFormSubmission.js";
import { useLookupOptions } from "../../../hooks/useLookupOptions.js";
import { EMPTY_SUPPLIER_FORM, INDIAN_STATES_AND_UNION_TERRITORIES } from "../supplierFormOptions.js";
import { createSupplier } from "../supplierService.js";

const ID_PREFIX = "supplier";

function AddSupplierModal({ onClose, onCreated }) {
  const categories = useLookupOptions("supplierCategories");
  const paymentTerms = useLookupOptions("paymentTerms");
  const form = useFormSubmission({
    initialValues: EMPTY_SUPPLIER_FORM,
    submit: (values, context) => createSupplier(values, context),
    onSuccess: (supplier) => onCreated(supplier),
  });
  const field = { form, idPrefix: ID_PREFIX };

  return (
    <Modal
      title="Add Supplier"
      description="Create a new supplier profile for your procurement network."
      width="md"
      onClose={onClose}
    >
      <ModalForm
        onSubmit={form.handleSubmit}
        onCancel={onClose}
        submitLabel="Add Supplier"
        isSubmitting={form.isSubmitting}
        formError={form.formError}
      >
        <div className="grid grid-cols-1 gap-x-3 gap-y-[11px] sm:grid-cols-2">
          <TextField {...field} name="name" label="Supplier Name" placeholder="Enter legal supplier name" autoComplete="organization" data-autofocus />
          <SelectField {...field} name="categoryId" label="Category" placeholder="Select category" lookup={categories} />
          <TextField {...field} name="gstin" label="GSTIN" placeholder="e.g. 27ABCDE1234F1Z5" autoCapitalize="characters" spellCheck={false} />
          <TextField {...field} name="pan" label="PAN" placeholder="e.g. ABCDE1234F" autoCapitalize="characters" spellCheck={false} />
          <TextField {...field} name="contactPerson" label="Contact Person" placeholder="Full name" autoComplete="name" />
          <TextField {...field} name="phone" label="Phone" type="tel" inputMode="tel" placeholder="+91 98765 43210" autoComplete="tel" />
          <TextField {...field} name="email" label="Email" type="email" placeholder="contact@supplier.com" autoComplete="email" className="sm:col-span-2" />
          <TextAreaField {...field} name="address" label="Address" placeholder="Street address, building and area" autoComplete="street-address" className="sm:col-span-2" />
          <TextField {...field} name="city" label="City" placeholder="Enter city" autoComplete="address-level2" />
          <SelectField {...field} name="state" label="State" placeholder="Select state" options={INDIAN_STATES_AND_UNION_TERRITORIES} />
          <SelectField {...field} name="paymentTermId" label="Payment Terms" placeholder="Select payment terms" lookup={paymentTerms} className="sm:col-span-2" />
        </div>
      </ModalForm>
    </Modal>
  );
}

export default AddSupplierModal;
