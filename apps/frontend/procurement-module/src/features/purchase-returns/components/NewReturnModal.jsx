import { useRef, useState } from "react";
import FormField from "../../../components/ui/FormField.jsx";
import LineItemsEditor from "../../../components/ui/LineItemsEditor.jsx";
import Modal from "../../../components/ui/Modal.jsx";
import ModalForm from "../../../components/ui/ModalForm.jsx";
import SegmentedControl from "../../../components/ui/SegmentedControl.jsx";
import SelectInput from "../../../components/ui/SelectInput.jsx";
import { DateField, TextAreaField } from "../../../components/ui/FormFields.jsx";
import { INPUT_CLASS } from "../../../components/ui/formStyles.js";
import { describeError } from "../../../components/ui/errorMessages.js";
import { useFormSubmission } from "../../../hooks/useFormSubmission.js";
import { useLookupOptions } from "../../../hooks/useLookupOptions.js";
import { isBlank, isPositiveDecimal } from "../../../lib/validation.js";
import { createPurchaseReturn, getReturnableLines } from "../purchaseReturnService.js";

const ID_PREFIX = "return";
const RESOLUTION_OPTIONS = [
  { value: "replacement", label: "Replacement" },
  { value: "refund", label: "Refund" },
];
const INITIAL_VALUES = { purchaseOrderId: "", returnDate: "", resolution: "replacement", items: [], notes: "" };

function validate(values) {
  const errors = {};
  const returning = values.items.filter((item) => !isBlank(item.quantityReturning));
  values.items.forEach((item, index) => {
    if (!isBlank(item.quantityReturning) && !isPositiveDecimal(item.quantityReturning)) {
      errors[`items.${index}.quantityReturning`] = "Quantity must be greater than zero.";
    }
  });
  if (values.purchaseOrderId && values.items.length > 0 && returning.length === 0) {
    errors.items = "Enter the quantity being returned for at least one item.";
  }
  return errors;
}

function NewReturnModal({ onClose, onCreated }) {
  const purchaseOrders = useLookupOptions("purchaseOrders");
  const reasons = useLookupOptions("returnReasons");
  const [source, setSource] = useState({ status: "idle", supplierName: "", error: null });
  const requestRef = useRef(null);

  const form = useFormSubmission({
    initialValues: INITIAL_VALUES,
    validate,
    submit: (values, context) =>
      createPurchaseReturn(
        {
          purchaseOrderId: values.purchaseOrderId,
          returnDate: values.returnDate,
          resolution: values.resolution,
          notes: values.notes,
          items: values.items
            .filter((item) => !isBlank(item.quantityReturning))
            .map((item) => ({ lineId: item.lineId, quantity: item.quantityReturning.trim(), reasonId: item.reasonId })),
        },
        context,
      ),
    onSuccess: onCreated,
  });
  const field = { form, idPrefix: ID_PREFIX };

  async function handlePurchaseOrderChange(event) {
    const purchaseOrderId = event.target.value;
    form.setValue("purchaseOrderId", purchaseOrderId);
    form.setValue("items", []);
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setSource({ status: "loading", supplierName: "", error: null });
    try {
      const result = await getReturnableLines(purchaseOrderId, controller.signal);
      form.setValue(
        "items",
        (result.lines ?? []).map((line) => ({
          lineId: line.lineId,
          itemName: line.itemName,
          quantityReceived: line.unitLabel ? `${line.quantityReceived} ${line.unitLabel}` : line.quantityReceived,
          quantityReturning: "",
          reasonId: "",
        })),
      );
      setSource({ status: "success", supplierName: result.supplier?.name ?? "", error: null });
    } catch (error) {
      if (error?.kind === "aborted") return;
      setSource({ status: "error", supplierName: "", error });
    }
  }

  let supplierText = "Auto-populated from purchase order";
  if (source.status === "loading") supplierText = "Loading purchase order…";
  if (source.status === "success" && source.supplierName) supplierText = source.supplierName;

  return (
    <Modal title="New Return" description="Record items being returned against a purchase order." width="xl" onClose={onClose}>
      <ModalForm
        onSubmit={form.handleSubmit}
        onCancel={onClose}
        submitLabel="Create Return"
        isSubmitting={form.isSubmitting}
        formError={form.formError}
      >
        <div className="grid grid-cols-1 gap-x-3 gap-y-[11px] sm:grid-cols-2">
          <FormField label="PO Reference" htmlFor={`${ID_PREFIX}-purchaseOrderId`} error={form.fieldErrors.purchaseOrderId}>
            <SelectInput
              id={`${ID_PREFIX}-purchaseOrderId`}
              name="purchaseOrderId"
              value={form.values.purchaseOrderId}
              placeholder="Select purchase order"
              options={purchaseOrders.options}
              status={purchaseOrders.status}
              invalid={Boolean(form.fieldErrors.purchaseOrderId)}
              onChange={handlePurchaseOrderChange}
            />
          </FormField>
          <FormField label="Supplier" htmlFor={`${ID_PREFIX}-supplier`}>
            <input
              id={`${ID_PREFIX}-supplier`}
              type="text"
              readOnly
              value={source.status === "success" ? source.supplierName : ""}
              placeholder={supplierText}
              className={`${INPUT_CLASS} cursor-default`}
            />
          </FormField>
          <DateField {...field} name="returnDate" label="Return Date" />
          <SegmentedControl
            id={`${ID_PREFIX}-resolution`}
            label="Replacement / Refund"
            value={form.values.resolution}
            options={RESOLUTION_OPTIONS}
            onChange={(value) => form.setValue("resolution", value)}
            error={form.fieldErrors.resolution}
          />
          <div className="sm:col-span-2">
            {source.status === "error" ? (
              <p role="alert" className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-[12px] text-ink">
                {describeError(source.error).message}
              </p>
            ) : (
              <LineItemsEditor
                form={form}
                idPrefix={ID_PREFIX}
                columns={[
                  { key: "itemName", label: "Item", width: "minmax(0,1fr)", kind: "readonly" },
                  { key: "quantityReceived", label: "Qty Received", width: "110px", kind: "readonly" },
                  { key: "quantityReturning", label: "Qty Returning", width: "118px", kind: "quantity", placeholder: "0" },
                  { key: "reasonId", label: "Reason", width: "190px", kind: "select", placeholder: "Select reason", lookup: reasons },
                ]}
                computedHint={
                  form.values.items.length === 0
                    ? "Select a purchase order to list its received items."
                    : undefined
                }
              />
            )}
          </div>
          <TextAreaField
            {...field}
            name="notes"
            label="Return Notes"
            placeholder="Add inspection notes, damage details or handling instructions"
            className="sm:col-span-2"
          />
        </div>
      </ModalForm>
    </Modal>
  );
}

export default NewReturnModal;
