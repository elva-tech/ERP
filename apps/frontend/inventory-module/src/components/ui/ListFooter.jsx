import Pagination from "./Pagination.jsx";

/** "Showing 1-8 of 48 suppliers" + pager, both driven by API pagination metadata. Single-page lists show neither. */
function ListFooter({ pagination, itemCount, noun, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null;
  const start = (pagination.page - 1) * pagination.pageSize + 1;
  const end = start + itemCount - 1;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
      <p className="text-[12px] leading-4 text-muted" aria-live="polite">
        Showing {start}-{end} of {pagination.totalItems} {noun}
      </p>
      <Pagination page={pagination.page} pageCount={pagination.totalPages} onPageChange={onPageChange} />
    </div>
  );
}

export default ListFooter;
