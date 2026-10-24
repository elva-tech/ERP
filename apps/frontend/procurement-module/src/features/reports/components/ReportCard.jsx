import { FileText } from "lucide-react";
import Panel from "../../../components/ui/Panel.jsx";

const FORMAT_LABELS = { pdf: "PDF", xlsx: "Excel" };

/** Report definition supplied by the API; generation happens on the server. */
function ReportCard({ report, onGenerate, isGenerating }) {
  return (
    <Panel as="article" className="flex flex-col px-[19px] pb-4 pt-4">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="grid size-[34px] shrink-0 place-items-center rounded-md bg-workspace text-brand">
          <FileText size={16} />
        </span>
        <h2 className="truncate text-[15px] font-bold leading-5 text-ink">{report.title}</h2>
      </div>
      <p className="mt-3 line-clamp-2 min-h-[30px] text-[11px] leading-[15px] text-muted">{report.description}</p>
      <div className="mt-auto flex items-center justify-between gap-3 pt-3">
        <span className="text-[10px] font-semibold text-muted">
          Formats: {(report.formats ?? []).map((format) => FORMAT_LABELS[format] ?? format).join(", ") || "—"}
        </span>
        <button
          type="button"
          onClick={() => onGenerate(report)}
          disabled={isGenerating}
          className="h-[26px] shrink-0 rounded bg-navy px-3 text-[10px] font-semibold text-white hover:bg-sidebar disabled:cursor-wait disabled:opacity-70"
        >
          {isGenerating ? "Generating…" : "Generate Report"}
        </button>
      </div>
    </Panel>
  );
}

export default ReportCard;
