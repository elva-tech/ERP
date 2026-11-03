import { EmptyState, ErrorState, LoadingState } from "./AsyncState.jsx";

const ALIGN_CLASSES = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

/**
 * Dense procurement table. Cells have no horizontal padding: column widths position the content,
 * matching the reference layouts where right-aligned columns sit flush against the next column.
 * With collapsed borders a cell height includes the 1px row border, so heights are the full row pitch.
 *
 * @param {{
 *   caption: string,
 *   columns: Array<{ key: string, header: import("react").ReactNode, width?: string, align?: "left" | "right" | "center",
 *     cellClass?: string, headerClass?: string, render?: (row: any) => import("react").ReactNode, truncate?: boolean }>,
 *   rows: any[],
 *   getRowKey: (row: any) => string,
 *   resource?: { status: string, error: any, reload: () => void },
 *   minWidth?: number,
 *   headerRowClass?: string,
 *   headerCellClass?: string,
 *   bodyCellClass?: string,
 *   rowClass?: string,
 *   emptyTitle?: string,
 *   emptyMessage?: string,
 * }} props
 */
function DataTable({
  caption,
  columns,
  rows,
  getRowKey,
  resource,
  minWidth = 1120,
  headerRowClass = "",
  headerCellClass = "h-8 text-[11.5px] font-semibold leading-4 text-muted",
  bodyCellClass = "h-[45px] text-[12px] leading-4",
  rowClass = "border-b border-line",
  emptyTitle = "No records found",
  emptyMessage,
}) {
  const status = resource?.status ?? "success";
  let stateContent = null;
  if (status === "loading") stateContent = <LoadingState compact />;
  else if (status === "error") stateContent = <ErrorState error={resource.error} onRetry={resource.reload} compact />;
  else if (rows.length === 0) stateContent = <EmptyState title={emptyTitle} message={emptyMessage} compact />;

  return (
    <div className="relative overflow-x-auto">
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
                className={`${headerCellClass} overflow-hidden whitespace-nowrap p-0 ${ALIGN_CLASSES[column.align ?? "left"]} ${
                  column.headerClass ?? ""
                }`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {stateContent ? (
            <tr>
              <td colSpan={columns.length} className="p-0">
                {stateContent}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={getRowKey(row)} className={rowClass}>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`${bodyCellClass} p-0 ${ALIGN_CLASSES[column.align ?? "left"]} ${
                      column.truncate === false ? "" : "overflow-hidden text-ellipsis whitespace-nowrap"
                    } ${column.cellClass ?? "text-muted"}`}
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
