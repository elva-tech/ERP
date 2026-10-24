import { apiRequest } from "../../lib/apiClient.js";

/**
 * @typedef {"active" | "inactive"} SupplierStatus
 * Whether "blocked" is a separate status is UNRESOLVED (PRD §5.3).
 */

/**
 * @typedef {Object} SupplierListItem
 * @property {string} id
 * @property {string} code
 * @property {string} name
 * @property {string | null} categoryName
 * @property {string | null} gstin
 * @property {string | null} contactPerson
 * @property {string | null} phone
 * @property {string | null} city
 * @property {SupplierStatus} status
 */

/**
 * @typedef {Object} SupplierCreateRequest
 * @property {string} name
 * @property {string} categoryId
 * @property {string} gstin
 * @property {string} pan
 * @property {string} contactPerson
 * @property {string} phone
 * @property {string} email
 * @property {string} address
 * @property {string} city
 * @property {string} state
 * @property {string} paymentTermId
 */

/** PROPOSED: GET /procurement/suppliers */
export function listSuppliers({ page, pageSize, search, categoryId, status }, signal) {
  return apiRequest("/procurement/suppliers", {
    query: { page, pageSize, search, categoryId, status },
    signal,
  });
}

/** PROPOSED: POST /procurement/suppliers */
export function createSupplier(payload, { idempotencyKey }) {
  return apiRequest("/procurement/suppliers", { method: "POST", body: payload, idempotencyKey });
}

/** PROPOSED: POST /procurement/suppliers/{id}/status-changes (audited, server-authorized). */
export function changeSupplierStatus(supplierId, { status, reason }, { idempotencyKey }) {
  return apiRequest(`/procurement/suppliers/${encodeURIComponent(supplierId)}/status-changes`, {
    method: "POST",
    body: { status, reason: reason || null },
    idempotencyKey,
  });
}
