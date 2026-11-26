export function paginateList(data, query = {}, defaultLimit = 20) {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Number(query.limit) || Number(query.pageSize) || defaultLimit;
  const totalItems = data.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    data: data.slice(start, start + pageSize),
    total: totalItems,
    pagination: {
      page: safePage,
      limit: pageSize,
      pageSize,
      totalItems,
      totalPages,
    },
  };
}