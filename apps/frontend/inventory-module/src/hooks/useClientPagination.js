import { useEffect, useMemo, useState } from "react";

/** Client-side pagination for filtered in-memory lists. */
export function useClientPagination(items, { pageSize = 10, resetKey = "" } = {}) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  const pagination = useMemo(() => {
    const totalItems = items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    return {
      page: Math.min(page, totalPages),
      pageSize,
      totalItems,
      totalPages,
    };
  }, [items.length, page, pageSize]);

  const slice = useMemo(() => {
    const start = (pagination.page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, pagination.page, pageSize]);

  return { page: pagination.page, setPage, pagination, slice };
}