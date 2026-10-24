import DataTable from "../../../components/ui/DataTable.jsx";
import RatingStars from "./RatingStars.jsx";

const withSuffix = (value, suffix) => (value === null || value === undefined || value === "" ? null : `${value}${suffix}`);

function metric(row, value, className = "") {
  if (row.dataSufficiency === "insufficient" || value === null) {
    return <span className="text-placeholder">Insufficient data</span>;
  }
  return <span className={className}>{value}</span>;
}

const COLUMNS = [
  { key: "supplier", header: "Supplier", cellClass: "font-semibold text-ink", render: (row) => row.supplier?.name ?? "—" },
  { key: "onTime", header: "On-Time %", width: "130px", align: "right", cellClass: "text-ink", render: (row) => metric(row, withSuffix(row.onTimeRate, "%")) },
  { key: "quality", header: "Quality Score", width: "130px", align: "right", cellClass: "text-ink", render: (row) => metric(row, withSuffix(row.qualityScore, "/100")) },
  { key: "rejection", header: "Rejection %", width: "130px", align: "right", cellClass: "", render: (row) => metric(row, withSuffix(row.rejectionRate, "%"), "text-danger") },
  { key: "response", header: "Response Time", width: "150px", align: "right", render: (row) => metric(row, withSuffix(row.avgResponseHours, " Hrs")) },
  {
    key: "rating",
    header: "Overall Rating",
    width: "150px",
    align: "right",
    cellClass: "",
    render: (row) =>
      row.dataSufficiency === "insufficient" || !row.overallRating ? (
        <span className="text-placeholder">Insufficient data</span>
      ) : (
        <RatingStars filledStars={row.filledStars} rating={row.overallRating} />
      ),
  },
];

function PerformanceIndexTable({ rows, resource }) {
  return (
    <DataTable
      caption="Detailed supplier performance index"
      columns={COLUMNS}
      rows={rows}
      getRowKey={(row) => row.supplier?.id}
      resource={resource}
      minWidth={900}
      headerCellClass="h-[28px] text-[11.5px] font-semibold leading-4 text-muted"
      bodyCellClass="h-[39px] text-[12px] leading-4"
      emptyTitle="No performance data for this period"
    />
  );
}

export default PerformanceIndexTable;
