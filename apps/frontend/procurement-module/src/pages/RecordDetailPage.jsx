import { FileText } from "lucide-react";
import { BackButton } from "../components/ui/DetailParts.jsx";
import Panel from "../components/ui/Panel.jsx";
import PurchaseInvoiceDetail from "../features/purchase-invoices/components/PurchaseInvoiceDetail.jsx";
import PurchaseOrderDetail from "../features/purchase-orders/components/PurchaseOrderDetail.jsx";
import RequisitionDetail from "../features/purchase-requisitions/components/RequisitionDetail.jsx";

const RECORD_TYPE_LABELS = {
  purchaseRequisition: "Purchase requisition",
  purchaseOrder: "Purchase order",
  purchaseInvoice: "Purchase invoice",
  purchaseReturn: "Purchase return",
  subcontractAgreement: "Subcontract agreement",
  subcontractOrder: "Subcontract order",
  subcontractBill: "Subcontract bill",
  approvalRequest: "Approval request",
  generatedReport: "Generated report",
};

const DETAIL_SCREENS = {
  purchaseRequisition: RequisitionDetail,
  purchaseOrder: PurchaseOrderDetail,
  purchaseInvoice: PurchaseInvoiceDetail,
};

/** Record types without an agreed detail contract state that plainly instead of inventing one. */
function RecordDetailPage({ route, onNotify }) {
  const type = route.query.get("type") ?? "";
  const id = route.query.get("id") ?? "";
  const number = route.query.get("number") ?? "";
  const DetailScreen = DETAIL_SCREENS[type];

  if (DetailScreen && id) return <DetailScreen key={id} id={id} onNotify={onNotify} />;

  const typeLabel = RECORD_TYPE_LABELS[type] ?? "Record";
  return (
    <Panel className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <FileText size={24} className="text-muted" aria-hidden="true" />
      <h2 className="text-[15px] font-semibold text-ink">
        {typeLabel}
        {number ? ` ${number}` : ""}
      </h2>
      <p className="max-w-md text-[13px] leading-5 text-muted">
        The detail view for this record has not been designed yet. No record data is shown here.
      </p>
      <div className="mt-2">
        <BackButton />
      </div>
    </Panel>
  );
}

export default RecordDetailPage;
