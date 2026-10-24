import DataTable from "../../../components/ui/DataTable.jsx";
import { displayText, formatDateTime } from "../../../lib/formatters.js";

const FORMAT_LABELS = { pdf: "PDF", xlsx: "EXCEL" };

function formatSize(bytes) {
  if (bytes === null || bytes === undefined) return "—";
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function GeneratedReportsTable({ reports, resource, onDownload, downloadingId }) {
  const columns = [
    { key: "name", header: "Report Name", cellClass: "font-semibold text-ink", render: (r) => displayText(r.fileName) },
    { key: "generated", header: "Generated Date", width: "120px", render: (r) => formatDateTime(r.generatedAt) },
    { key: "size", header: "File Size", width: "120px", render: (r) => formatSize(r.sizeBytes) },
    { key: "format", header: "Format", width: "130px", render: (r) => FORMAT_LABELS[r.format] ?? displayText(r.format) },
    {
      key: "view",
      header: "View",
      width: "90px",
      cellClass: "",
      render: (r) =>
        r.status === "ready" ? (
          <button type="button" onClick={() => onDownload(r)} className="font-medium text-link underline underline-offset-2 hover:text-navy">
            View
          </button>
        ) : (
          <span className="text-muted">{r.status === "failed" ? "Failed" : "Processing…"}</span>
        ),
    },
    {
      key: "action",
      header: "Action",
      width: "90px",
      align: "right",
      cellClass: "",
      render: (r) =>
        r.status === "ready" ? (
          <button
            type="button"
            onClick={() => onDownload(r)}
            disabled={downloadingId === r.id}
            className="font-semibold text-brand hover:underline disabled:opacity-60"
          >
            {downloadingId === r.id ? "Downloading…" : "Download"}
          </button>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
  ];

  return (
    <DataTable
      caption="Recently generated reports"
      columns={columns}
      rows={reports}
      getRowKey={(row) => row.id}
      resource={resource}
      minWidth={760}
      headerCellClass="h-7 text-[11px] font-semibold leading-4 text-muted"
      bodyCellClass="h-9 text-[12px] leading-4"
      emptyTitle="No reports generated yet"
    />
  );
}

export default GeneratedReportsTable;
