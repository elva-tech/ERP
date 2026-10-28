import { useState } from "react";
import { CircleCheck, ExternalLink, FileText } from "lucide-react";
import { ResourceBoundary } from "../../../components/ui/AsyncState.jsx";
import { StatusBadge } from "../../../components/ui/Badge.jsx";
import { ActionButton, BackButton, DetailHeader, DetailSection, FieldGrid } from "../../../components/ui/DetailParts.jsx";
import { useAsyncResource } from "../../../hooks/useAsyncResource.js";
import { downloadAttachmentFile } from "../../../lib/attachmentService.js";
import { displayText, formatDate, formatInr } from "../../../lib/formatters.js";
import { getSubcontractAgreement } from "../subcontractAgreementService.js";
import { AGREEMENT_STATUS_BADGES } from "../subcontractAgreementStatus.js";
import AgreementStatusModal from "./AgreementStatusModal.jsx";

function AgreementDetail({ id, onNotify }) {
  const resource = useAsyncResource((signal) => getSubcontractAgreement(id, signal), `subcontract-agreement:${id}`);
  const [isCompleteOpen, setIsCompleteOpen] = useState(false);
  const [openingId, setOpeningId] = useState(null);
  const agreement = resource.data;

  async function viewSignedCopy(attachmentId) {
    setOpeningId(attachmentId);
    try {
      const blob = await downloadAttachmentFile(attachmentId);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      onNotify("Could not open the signed copy. Try again.");
    } finally {
      setOpeningId(null);
    }
  }

  if (!agreement) {
    return (
      <div className="flex flex-1 flex-col gap-4">
        <div>
          <BackButton />
        </div>
        <ResourceBoundary resource={resource} />
      </div>
    );
  }

  const canComplete = (agreement.allowedActions ?? []).includes("complete");

  return (
    <div className="flex flex-1 flex-col gap-4">
      <DetailHeader
        title={`Subcontract Agreement ${displayText(agreement.agreementNumber)}`}
        subtitle={agreement.title}
        badge={<StatusBadge status={agreement.status} statusMap={AGREEMENT_STATUS_BADGES} />}
        actions={
          canComplete && (
            <ActionButton tone="success" icon={CircleCheck} onClick={() => setIsCompleteOpen(true)}>
              Mark as Completed
            </ActionButton>
          )
        }
      />

      <DetailSection title="Agreement Details">
        <FieldGrid
          fields={[
            { label: "Agreement No", value: displayText(agreement.agreementNumber) },
            { label: "Agreement Date", value: formatDate(agreement.agreementDate) },
            { label: "Status", value: <StatusBadge status={agreement.status} statusMap={AGREEMENT_STATUS_BADGES} /> },
            { label: "Subcontractor", value: displayText(agreement.subcontractor?.name) },
            { label: "Project / Site", value: displayText(agreement.projectName) },
            { label: "Payment Schedule", value: displayText(agreement.paymentScheduleLabel) },
            { label: "Agreement Value", value: <span className="font-bold">{formatInr(agreement.agreementValue)}</span> },
            { label: "Start Date", value: formatDate(agreement.startDate) },
            { label: "End Date", value: formatDate(agreement.endDate) },
            { label: "Title", value: displayText(agreement.title), wide: true },
            { label: "Scope of Work", value: displayText(agreement.scopeOfWork), wide: true },
            { label: "Terms & Conditions", value: displayText(agreement.termsAndConditions), wide: true },
            {
              label: "Status rules",
              value: (
                <span className="text-[12px] leading-[18px] text-muted">
                  Expired is set automatically after the end date. Completed is set when you mark the agreement finished; there is no
                  manual toggle for Active or Expired on the list.
                </span>
              ),
              wide: true,
            },
          ]}
        />
      </DetailSection>

      <DetailSection title="Signed Copy (PDF)">
        {(agreement.attachments ?? []).length === 0 ? (
          <p className="text-[12px] text-muted">No signed copy uploaded.</p>
        ) : (
          <ul className="space-y-2">
            {agreement.attachments.map((file) => (
              <li key={file.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-field px-3 py-2.5">
                <span className="flex min-w-0 items-center gap-2 text-[13px] text-ink">
                  <FileText size={16} className="shrink-0 text-danger" aria-hidden="true" />
                  <span className="truncate font-semibold">{file.fileName}</span>
                  <span className="shrink-0 text-[11px] uppercase text-muted">PDF</span>
                </span>
                <button
                  type="button"
                  disabled={openingId === file.id}
                  onClick={() => viewSignedCopy(file.id)}
                  className="inline-flex h-[31px] items-center gap-1.5 rounded-md border border-line bg-surface px-3 text-[12px] font-semibold text-link hover:bg-workspace disabled:opacity-60"
                >
                  <ExternalLink size={14} aria-hidden="true" />
                  {openingId === file.id ? "Opening…" : "View PDF"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </DetailSection>

      {isCompleteOpen && (
        <AgreementStatusModal
          agreement={agreement}
          onClose={() => setIsCompleteOpen(false)}
          onChanged={() => {
            setIsCompleteOpen(false);
            resource.reload();
            onNotify(`${agreement.agreementNumber} marked completed.`);
          }}
        />
      )}
    </div>
  );
}

export default AgreementDetail;
