const BUTTON_CLASS =
  "inline-flex h-[27px] items-center justify-center rounded border text-[12px] leading-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-navy disabled:cursor-not-allowed";

const MAX_VISIBLE_PAGES = 3;

function visiblePages(page, pageCount) {
  const count = Math.min(MAX_VISIBLE_PAGES, pageCount);
  const start = Math.min(Math.max(1, page - Math.floor(count / 2)), pageCount - count + 1);
  return Array.from({ length: count }, (_, index) => start + index);
}

/** Server-driven pagination: `page` and `pageCount` come from the API's pagination metadata. */
function Pagination({ page, pageCount, onPageChange, disabled = false }) {
  return (
    <nav aria-label="Pagination" className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={disabled || page <= 1}
        className={`${BUTTON_CLASS} border-line bg-surface px-2 text-ink hover:bg-workspace`}
      >
        &lt; Prev
      </button>
      {visiblePages(page, pageCount).map((pageNumber) => (
        <button
          key={pageNumber}
          type="button"
          onClick={() => onPageChange(pageNumber)}
          disabled={disabled}
          aria-current={pageNumber === page ? "page" : undefined}
          aria-label={`Page ${pageNumber}`}
          className={`${BUTTON_CLASS} w-[30px] ${
            pageNumber === page
              ? "border-navy bg-navy font-semibold text-white"
              : "border-line bg-surface text-ink hover:bg-workspace"
          }`}
        >
          {pageNumber}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={disabled || page >= pageCount}
        className={`${BUTTON_CLASS} border-line bg-surface px-2 text-ink hover:bg-workspace`}
      >
        Next &gt;
      </button>
    </nav>
  );
}

export default Pagination;
