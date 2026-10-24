/**
 * Shared JavaScript-facing data shapes for Procurement API responses.
 * These describe the PROPOSED contract in `docs/backend-api-contract.md`.
 *
 * Conventions:
 * - Identifiers are opaque strings.
 * - Money and quantities are decimal strings (e.g. "4520000.00"), never JS numbers.
 * - Dates are ISO `YYYY-MM-DD`; timestamps are ISO 8601 with offset.
 */

/**
 * @template T
 * @typedef {Object} PaginatedResponse
 * @property {T[]} items
 * @property {{ page: number, pageSize: number, totalItems: number, totalPages: number }} pagination
 */

/**
 * @typedef {Object} ListQuery
 * @property {number} [page]
 * @property {number} [pageSize]
 * @property {string} [search]
 * @property {string} [sort] e.g. "-documentDate"
 * @property {string} [status]
 */

/**
 * @typedef {Object} PartyReference
 * @property {string} id
 * @property {string} code
 * @property {string} name
 */

/**
 * @typedef {Object} SelectOption
 * @property {string} value
 * @property {string} label
 */

export const DEFAULT_PAGE_SIZE = 8;

/**
 * Normalizes a list response so components never read an undefined `items` array.
 * Does not fabricate data: a malformed payload produces an empty page with zero totals.
 * @template T
 * @param {PaginatedResponse<T> | null | undefined} response
 * @returns {PaginatedResponse<T>}
 */
export function normalizePage(response) {
  const items = Array.isArray(response?.items) ? response.items : [];
  const pagination = response?.pagination ?? {};
  return {
    items,
    pagination: {
      page: Number(pagination.page) || 1,
      pageSize: Number(pagination.pageSize) || items.length,
      totalItems: Number(pagination.totalItems) || 0,
      totalPages: Math.max(1, Number(pagination.totalPages) || 1),
    },
  };
}
