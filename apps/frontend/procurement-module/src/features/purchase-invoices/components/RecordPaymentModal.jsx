import Modal from "../../../components/ui/Modal.jsx";
import ModalForm from "../../../components/ui/ModalForm.jsx";
import { DateField, IndianMoneyField, TextField } from "../../../components/ui/FormFields.jsx";
import { useFormSubmission } from "../../../hooks/useFormSubmission.js";
import { formatInr, parseIndianMoneyInput } from "../../../lib/formatters.js";
import { exceedsDecimal, isBlank, isMoneyAmount, isPositiveDecimal } from "../../../lib/validation.js";
import { recordInvoicePayment } from "../purchaseInvoiceService.js";

const ID_PREFIX = "invoice-payment";
const INITIAL_VALUES = { amount: "", transactionId: "", paymentDate: "" };

/** Records one (partial) payment. The backend recalculates the balance and marks the invoice paid when it reaches zero. */
function RecordPaymentModal({ invoice, onClose, onRecorded }) {
  const form = useFormSubmission({
    initialValues: INITIAL_VALUES,
    validate: (values) => {
      const errors = {};
      const amount = parseIndianMoneyInput(values.amount);
      if (!isMoneyAmount(amount) || !isPositiveDecimal(amount)) {
        errors.amount = "Enter an amount greater than zero, with up to two decimals.";
      } else if (exceedsDecimal(amount, invoice.balanceDue, 2)) {
        errors.amount = `Cannot exceed the balance due of ${formatInr(invoice.balanceDue, { fractionDigits: 2 })}.`;
      }
      if (isBlank(values.transactionId)) errors.transactionId = "Enter the transaction ID.";
      if (isBlank(values.paymentDate)) errors.paymentDate = "Select the payment date.";
      return errors;
    },
    submit: (values, context) =>
      recordInvoicePayment(
        invoice.id,
        { amount: parseIndianMoneyInput(values.amount), transactionId: values.transactionId.trim(), paymentDate: values.paymentDate },
        context,
      ),
    onSuccess: onRecorded,
  });
  const field = { form, idPrefix: ID_PREFIX };

  return (
    <Modal
      title="Record Partial Payment"
      description={`${invoice.invoiceNumber} · balance due ${formatInr(invoice.balanceDue, { fractionDigits: 2 })} of net payable ${formatInr(invoice.netPayable, { fractionDigits: 2 })}`}
      width="sm"
      onClose={onClose}
    >
      <ModalForm onSubmit={form.handleSubmit} onCancel={onClose} submitLabel="Record Payment" isSubmitting={form.isSubmitting} formError={form.formError}>
        <div className="grid grid-cols-1 gap-y-[11px]">
          <IndianMoneyField {...field} name="amount" label="Payment Amount" required />
          <TextField {...field} name="transactionId" label="Transaction ID" required placeholder="UTR / cheque / reference number" autoComplete="off" />
          <DateField {...field} name="paymentDate" label="Payment Date" required />
        </div>
      </ModalForm>
    </Modal>
  );
}

export default RecordPaymentModal;
