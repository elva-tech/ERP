import { apiRequest } from "../../lib/apiClient.js";

/**
 * @typedef {"draft" | "sent" | "partially_received" | "completed" | "cancelled"} PurchaseOrderStatus
 *
 * @typedef {Object} PurchaseOrderListItem
 * @property {string} id
 * @property {string} orderNumber
 * @property {string} orderDate
 * @property {{ id: string, name: string }} supplier
 * @property {string | null} itemsSummary
 * @property {string} totalAmount        Decimal string, calculated by the backend.
 * @property {string | null} deliveryDate
 * @property {PurchaseOrderStatus} status
 *
 * @typedef {Object} PurchaseOrderCreateRequest
 * @property {string} supplierId
 * @property {string} requisitionId
 * @property {string} deliveryDate
 * @property {string} paymentTermId
 * @property {Array<{ description: string, quantity: string, unitPrice: string }>} items
 * @property {string} shippingAddress
 * @property {string} notes
 *
 * @typedef {Object} PurchaseOrderReceipt
 * @property {string} id
 * @property {string} receiptNumber
 * @property {string} receivedDate     ISO date.
 * @property {string} amount           Decimal string, backend-calculated (received quantity × unit price, incl. GST).
 * @property {Array<{ lineId: string, description: string, unitLabel: string | null, quantity: string }>} items
 * @property {{ id: string, displayName: string } | null} recordedBy
 * @property {string} recordedAt
 *
 * @typedef {PurchaseOrderListItem & {
 *   requisition: { id: string, requisitionNumber: string } | null,
 *   paymentTermsLabel: string | null, shippingAddress: string | null, notes: string | null,
 *   createdBy: { id: string, displayName: string } | null,
 *   items: Array<{ lineId: string, description: string, unitLabel: string | null, quantity: string, receivedQuantity: string,
 *     remainingQuantity: string, unitPrice: string, amount: string }>,
 *   subtotal: string, taxRatePercent: string, taxAmount: string, receivedAmount: string,
 *   receipts: PurchaseOrderReceipt[],
 *   allowedActions: Array<"send" | "receive" | "complete" | "cancel">,
 * }} PurchaseOrderDetail
 *
 * @typedef {Object} PurchaseOrderReceiptRequest
 * @property {string} receivedDate
 * @property {Array<{ lineId: string, quantity: string }>} items  Every PO line in order; blank quantity = not received.
 */

/** PROPOSED: GET /procurement/purchase-orders/{id} → PurchaseOrderDetail */
export function getPurchaseOrder(id, signal) {
  return apiRequest(`/procurement/purchase-orders/${encodeURIComponent(id)}`, { signal });
}

/** PROPOSED: POST /procurement/purchase-orders/{id}/status-changes `{ status: "sent" | "completed" | "cancelled" }` → PurchaseOrderDetail */
export function changePurchaseOrderStatus(id, payload, { idempotencyKey }) {
  return apiRequest(`/procurement/purchase-orders/${encodeURIComponent(id)}/status-changes`, { method: "POST", body: payload, idempotencyKey });
}

/**
 * PROPOSED: POST /procurement/purchase-orders/{id}/receipts → PurchaseOrderDetail.
 * The backend rejects quantities above the remaining quantity and sets "partially_received", or "completed" when nothing remains.
 */
export function recordPurchaseOrderReceipt(id, payload, { idempotencyKey }) {
  return apiRequest(`/procurement/purchase-orders/${encodeURIComponent(id)}/receipts`, { method: "POST", body: payload, idempotencyKey });
}

/** PROPOSED: GET /procurement/purchase-orders */
export function listPurchaseOrders({ page, pageSize, status, search }, signal) {
  return apiRequest("/procurement/purchase-orders", { query: { page, pageSize, status, search }, signal });
}

/** PROPOSED: POST /procurement/purchase-orders (line amounts, taxes and totals are computed server-side) */
export function createPurchaseOrder(payload, { idempotencyKey }) {
  return apiRequest("/procurement/purchase-orders", { method: "POST", body: payload, idempotencyKey });
}
