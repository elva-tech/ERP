/**
 * Shared list-search semantics for the demo API (case-insensitive substring match).
 * Keep aligned with docs/backend-api-contract.md list endpoint `search` parameters.
 */

export function listSearchTerm(raw) {
  return String(raw ?? "").trim().toLowerCase();
}

export function listSearchMatch(term, fields) {
  if (!term) return true;
  return fields.some((field) => String(field ?? "").toLowerCase().includes(term));
}

export function paginateItems(items, { page = 1, pageSize = 8 } = {}) {
  const size = Math.min(100, Math.max(1, Number(pageSize) || 8));
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / size));
  const safePage = Math.min(totalPages, Math.max(1, Number(page) || 1));
  return {
    items: items.slice((safePage - 1) * size, safePage * size),
    pagination: { page: safePage, pageSize: size, totalItems, totalPages },
  };
}