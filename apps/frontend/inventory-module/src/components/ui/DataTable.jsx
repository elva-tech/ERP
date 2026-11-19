
import { EmptyState, ErrorState, LoadingState } from "./AsyncState.jsx";
const ALIGN_CLASSES = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};
function DataTable({
  caption,
  columns,
  rows = [],
  getRowKey,
  resource,
  minWidth = 1120,
  headerRowClass = "",
  headerCellClass = "h-8 text-[11.5px] font-semibold leading-4 text-muted",
  bodyCellClass = "h-[45px] text-[12px] leading-4",
  rowClass = "border-b border-line",
  onRowClick,
  getRowClassName,
  emptyTitle = "No records found",
  emptyMessage,
  layout = "table",
}) {
  const status = resource?.status ?? "success";
  let stateContent = null;
  if (status === "loading") {
    stateContent = <LoadingState compact />;
  } else if (status === "error") {
    stateContent = <ErrorState error={resource?.error} onRetry={resource?.reload} compact />;
  } else if (rows.length === 0) {
    stateContent = <EmptyState title={emptyTitle} message={emptyMessage} compact />;
  }
  const gridColumns = columns.map((column) => column.width || "minmax(0, 1fr)").join(" ");
  const getCellClass = (column, isHeader = false) => {
    const base = isHeader ? headerCellClass : bodyCellClass;
    const extra = isHeader ? column.headerClass : column.cellClass;
    return `${base} min-w-0 px-3 ${ALIGN_CLASSES[column.align ?? "left"]} ${extra ?? ""}`;
  };
  if (layout === "grid") {
    return (
      <div className="relative w-full overflow-x-auto">
        <div role="table" aria-label={caption} aria-busy={status === "loading"} style={{ minWidth }}>
          <div role="rowgroup">
            <div role="row" className={`grid items-center border-b border-line ${headerRowClass}`} style={{ gridTemplateColumns: gridColumns }}>
              {columns.map((column) => (
                <div
                  key={column.key}
                  role="columnheader"
                  className={`${getCellClass(column, true)} flex items-center overflow-hidden whitespace-nowrap`}
                  style={{ justifyContent: column.align === "right" ? "flex-end" : column.align === "center" ? "center" : "flex-start" }}
                >
                  {column.header}
                </div>
              ))}
            </div>
          </div>
          <div role="rowgroup">
            {stateContent ? (
              <div role="row">
                <div role="cell">{stateContent}</div>
              </div>
            ) : (
              rows.map((row) => (
                <div
                  key={getRowKey(row)}
                  role="row"
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`grid items-center ${rowClass} ${onRowClick ? "cursor-pointer" : ""} ${getRowClassName ? getRowClassName(row) : ""}`}
                  style={{ gridTemplateColumns: gridColumns }}
                >
                  {columns.map((column) => (
                    <div
                      key={column.key}
                      role="cell"
                      className={`${getCellClass(column)} flex min-w-0 items-center ${column.truncate === false ? "" : "overflow-hidden"}`}
                      style={{ justifyContent: column.align === "right" ? "flex-end" : column.align === "center" ? "center" : "flex-start" }}
                    >
                      <div className={column.truncate === false ? "min-w-0" : "min-w-0 max-w-full truncate"}>
                        {column.render ? column.render(row) : row[column.key]}
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="relative w-full overflow-x-auto">
      <table className="w-full table-fixed border-collapse" style={{ minWidth }} aria-busy={status === "loading"}>
        <caption className="sr-only">{caption}</caption>
        <colgroup>
          {columns.map((column) => (
            <col key={column.key} style={column.width ? { width: column.width } : undefined} />
          ))}
        </colgroup>
        <thead>
          <tr className={`border-b border-line ${headerRowClass}`}>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={`${headerCellClass} overflow-hidden whitespace-nowrap px-3 ${ALIGN_CLASSES[column.align ?? "left"]} ${column.headerClass ?? ""}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {stateContent ? (
            <tr>
              <td colSpan={columns.length} className="p-0">{stateContent}</td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={getRowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`${rowClass} ${onRowClick ? "cursor-pointer" : ""} ${getRowClassName ? getRowClassName(row) : ""}`}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`${bodyCellClass} px-3 ${ALIGN_CLASSES[column.align ?? "left"]} ${column.truncate === false ? "" : "overflow-hidden text-ellipsis whitespace-nowrap"} ${column.cellClass ?? "text-muted"}`}
                  >
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
export default DataTable;
