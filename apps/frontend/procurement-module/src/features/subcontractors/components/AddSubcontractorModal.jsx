import Modal from "../../../components/ui/Modal.jsx";
import ModalForm from "../../../components/ui/ModalForm.jsx";
// Rating input is disabled for now.
// import StarRatingInput from "../../../components/ui/StarRatingInput.jsx";
import { DateField, SelectField, TextAreaField, TextField } from "../../../components/ui/FormFields.jsx";
import { useFormSubmission } from "../../../hooks/useFormSubmission.js";
import { useLookupOptions } from "../../../hooks/useLookupOptions.js";
import { createSubcontractor } from "../subcontractorService.js";

const ID_PREFIX = "subcontractor";
const INITIAL_VALUES = {
  name: "",
  firmName: "",
  gstin: "",
  pan: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  tradeSpecialtyId: "",
  licenseNumber: "",
  licenseExpiryDate: "",
  // Rating input is disabled for now.
  // initialRating: "",
};

function AddSubcontractorModal({ onClose, onCreated }) {
  const trades = useLookupOptions("tradeSpecialties");
  const form = useFormSubmission({
    initialValues: INITIAL_VALUES,
    submit: (values, context) =>
      // Rating input is disabled for now.
      // createSubcontractor({ ...values, initialRating: values.initialRating ? Number(values.initialRating) : null }, context),
      createSubcontractor(values, context),
    onSuccess: onCreated,
  });
  const field = { form, idPrefix: ID_PREFIX };

  return (
    <Modal
      title="Add Subcontractor"
      description="Create a verified subcontractor profile for your project network."
      width="lg"
      onClose={onClose}
    >
      <ModalForm
        onSubmit={form.handleSubmit}
        onCancel={onClose}
        submitLabel="Add Subcontractor"
        isSubmitting={form.isSubmitting}
        formError={form.formError}
      >
        <div className="grid grid-cols-1 gap-x-3 gap-y-[11px] sm:grid-cols-2">
          <TextField {...field} name="name" label="Subcontractor Name" placeholder="Enter subcontractor name" data-autofocus />
          <TextField {...field} name="firmName" label="Company / Firm" placeholder="Enter registered firm name" autoComplete="organization" />
          <TextField {...field} name="gstin" label="GSTIN" placeholder="e.g. 27ABCDE1234F1Z5" autoCapitalize="characters" spellCheck={false} />
          <TextField {...field} name="pan" label="PAN" placeholder="e.g. ABCDE1234F" autoCapitalize="characters" spellCheck={false} />
          <TextField {...field} name="contactPerson" label="Contact Person" placeholder="Full name" autoComplete="name" />
          <TextField {...field} name="phone" label="Phone" type="tel" inputMode="tel" placeholder="+91 98765 43210" autoComplete="tel" />
          <TextField {...field} name="email" label="Email" type="email" placeholder="contact@subcontractor.com" autoComplete="email" className="sm:col-span-2" />
          <TextAreaField {...field} name="address" label="Address" placeholder="Street address, building, area, city and PIN" autoComplete="street-address" className="sm:col-span-2" />
          <SelectField {...field} name="tradeSpecialtyId" label="Trade / Specialty" placeholder="Select trade or specialty" lookup={trades} />
          <TextField {...field} name="licenseNumber" label="License Number" placeholder="Enter license number" spellCheck={false} />
          <DateField {...field} name="licenseExpiryDate" label="License Expiry Date" />
          {/* Rating input is disabled for now.
          <StarRatingInput
            id={`${ID_PREFIX}-initialRating`}
            label="Rating"
            value={form.values.initialRating}
            onChange={(value) => form.setValue("initialRating", value)}
            error={form.fieldErrors.initialRating}
          />
          */}
        </div>
      </ModalForm>
    </Modal>
  );
}

export default AddSubcontractorModal;
