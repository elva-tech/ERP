import LineItemsEditor from "../../../components/ui/LineItemsEditor.jsx";
import Modal from "../../../components/ui/Modal.jsx";
import ModalForm from "../../../components/ui/ModalForm.jsx";
import { DateField, SelectField, TextAreaField, TextField } from "../../../components/ui/FormFields.jsx";
import { useFormSubmission } from "../../../hooks/useFormSubmission.js";
import { useLookupOptions } from "../../../hooks/useLookupOptions.js";
import { isBlank, isMoneyAmount, isPositiveDecimal } from "../../../lib/validation.js";
import { createPurchaseRequisition } from "../purchaseRequisitionService.js";

const ID_PREFIX = "requisition";
const EMPTY_ITEM = { description: "", quantity: "", unitId: "", estimatedCost: "" };
const INITIAL_VALUES = {
  title: "",
  departmentId: "",
  priority: "",
  requiredDate: "",
  items: [{ ...EMPTY_ITEM }],
  justification: "",
  approverId: "",
};

function validate(values) {
  const errors = {};
  values.items.forEach((item, index) => {
    if (!isBlank(item.quantity) && !isPositiveDecimal(item.quantity)) {
      errors[`items.${index}.quantity`] = "Quantity must be greater than zero.";
    }
    if (!isBlank(item.estimatedCost) && !isMoneyAmount(item.estimatedCost)) {
      errors[`items.${index}.estimatedCost`] = "Enter an amount with up to two decimals.";
    }
  });
  return errors;
}

function NewRequisitionModal({ onClose, onCreated }) {
  const departments = useLookupOptions("departments");
  const priorities = useLookupOptions("requisitionPriorities");
  const approvers = useLookupOptions("approvers");
  const units = useLookupOptions("units");
  const form = useFormSubmission({
    initialValues: INITIAL_VALUES,
    validate,
    submit: (values, context) =>
      createPurchaseRequisition(
        { ...values, items: values.items.map((item) => ({ ...item, quantity: item.quantity.trim(), estimatedCost: item.estimatedCost.trim() })) },
        context,
      ),
    onSuccess: onCreated,
  });
  const field = { form, idPrefix: ID_PREFIX };

  return (
    <Modal
      title="New Purchase Requisition"
      description="Add request details, line items and the approval route."
      width="xl"
      onClose={onClose}
    >
      <ModalForm
        onSubmit={form.handleSubmit}
        onCancel={onClose}
        submitLabel="Submit Requisition"
        isSubmitting={form.isSubmitting}
        formError={form.formError}
      >
        <div className="grid grid-cols-1 gap-x-3 gap-y-[11px] sm:grid-cols-3">
          <TextField {...field} name="title" label="PR Title" placeholder="Enter a clear title for this request" className="sm:col-span-3" data-autofocus />
          <SelectField {...field} name="departmentId" label="Department" placeholder="Select department" lookup={departments} />
          <SelectField {...field} name="priority" label="Priority" placeholder="Select priority" lookup={priorities} />
          <DateField {...field} name="requiredDate" label="Required Date" />
          <div className="sm:col-span-3">
            <LineItemsEditor
              form={form}
              idPrefix={ID_PREFIX}
              emptyItem={EMPTY_ITEM}
              addLabel="Add line item"
              columns={[
                { key: "description", label: "Description", width: "minmax(0,1fr)", placeholder: "Select item..." },
                { key: "quantity", label: "Qty", width: "96px", kind: "quantity", placeholder: "1" },
                { key: "unitId", label: "Unit", width: "120px", kind: "select", placeholder: "Unit", lookup: units },
                { key: "estimatedCost", label: "Est. Cost", width: "140px", kind: "decimal", placeholder: "0.00" },
              ]}
            />
          </div>
        </div>
        <div className="mt-[11px] grid grid-cols-1 gap-x-3 gap-y-[11px] sm:grid-cols-2">
          <TextAreaField {...field} name="justification" label="Justification" placeholder="Explain the business need..." />
          <SelectField {...field} name="approverId" label="Approver" placeholder="Select approver" lookup={approvers} />
        </div>
      </ModalForm>
    </Modal>
  );
}

export default NewRequisitionModal;
