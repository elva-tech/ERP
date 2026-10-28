import { apiRequest } from "../../lib/apiClient.js";

/**
 * @typedef {"pending_approval" | "credit_note_issued" | "rejected"} PurchaseReturnStatus
 *
 * @typedef {Object} PurchaseReturnListItem
 * @property {string} id
 * @property {string} returnNumber
 * @property {string} returnDate
 * @property {{ id: string, name: string }} supplier
 * @property {{ type: "purchaseOrder" | "purchaseInvoice", id: string, number: string } | null} sourceDocument
 * @property {string | null} reasonLabel
 * @property {string | null} itemsSummary
 * @property {string} amount
 * @property {PurchaseReturnStatus} status
 *
 * @typedef {Object} ReturnablePurchaseOrder
 * @property {{ id: string, name: string }} supplier
 * @property {Array<{ lineId: string, itemName: string, quantityReceived: string, unitLabel: string | null }>} lines
 */

/** PROPOSED: GET /procurement/purchase-returns */
export function listPurchaseReturns({ page, pageSize, status }, signal) {
  return apiRequest("/procurement/purchase-returns", { query: { page, pageSize, status }, signal });
}

/** PROPOSED: GET /procurement/purchase-returns/summary */
export function getPurchaseReturnSummary(signal) {
  return apiRequest("/procurement/purchase-returns/summary", { signal });
}

/** PROPOSED: GET /procurement/purchase-orders/{id}/returnable-lines — supplier and received quantities for a PO. */
export function getReturnableLines(purchaseOrderId, signal) {
  return apiRequest(`/procurement/purchase-orders/${encodeURIComponent(purchaseOrderId)}/returnable-lines`, { signal });
}

/** PROPOSED: POST /procurement/purchase-returns */
export function createPurchaseReturn(payload, { idempotencyKey }) {
  return apiRequest("/procurement/purchase-returns", { method: "POST", body: payload, idempotencyKey });
}
