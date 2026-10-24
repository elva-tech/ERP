import { apiRequest } from "../../lib/apiClient.js";

/**
 * @typedef {"draft" | "paid" | "partially_paid" | "overdue"} PurchaseInvoiceStatus
 * New invoices are created as "draft". "pending_verification" and "verified" are disabled for now.
 * Whether "overdue" is a stored status or a derived flag is UNRESOLVED.
 *
 * @typedef {Object} PurchaseInvoiceListItem
 * @property {string} id
 * @property {string} invoiceNumber
 * @property {string} invoiceDate
 * @property {{ id: string, name: string }} supplier
 * @property {{ id: string, orderNumber: string } | null} purchaseOrder
 * @property {string} invoiceAmount   Decimal string.
 * @property {string} tdsAmount       Decimal string, backend-calculated.
 * @property {string} netPayable      Decimal string, backend-calculated.
 * @property {string | null} dueDate
 * @property {PurchaseInvoiceStatus} status
 *
 * @typedef {Object} PurchaseInvoiceSummary
 * @property {number} totalInvoices
 * @property {string} totalAmount
 * @property {string} overdueAmount
 *
 * @typedef {Object} InvoicePayment
 * @property {string} id
 * @property {string} paymentDate     ISO date.
 * @property {string} amount          Decimal string.
 * @property {string} transactionId
 * @property {{ id: string, displayName: string } | null} recordedBy
 * @property {string} recordedAt      ISO date-time.
 *
 * @typedef {PurchaseInvoiceListItem & {
 *   items: Array<{ description: string, quantity: string, rate: string, amount: string }>,
 *   taxableAmount: string, taxRatePercent: string, taxAmount: string, tdsRatePercent: string,
 *   paidAmount: string, balanceDue: string,
 *   payments: InvoicePayment[],
 *   attachments: Array<{ id: string, fileName: string }>,
 *   allowedActions: Array<"recordPayment">,
 * }} PurchaseInvoiceDetail
 * All amounts are decimal strings calculated by the backend. `balanceDue` = `netPayable` − `paidAmount`.
 *
 * @typedef {Object} InvoicePaymentRequest
 * @property {string} amount          Decimal string; must be > 0 and ≤ `balanceDue`.
 * @property {string} transactionId
 * @property {string} paymentDate     ISO date.
 */

/** PROPOSED: GET /procurement/purchase-invoices */
export function listPurchaseInvoices({ page, pageSize, status, search }, signal) {
  return apiRequest("/procurement/purchase-invoices", { query: { page, pageSize, status, search }, signal });
}

/** PROPOSED: GET /procurement/purchase-invoices/summary */
export function getPurchaseInvoiceSummary(signal) {
  return apiRequest("/procurement/purchase-invoices/summary", { signal });
}

/** PROPOSED: GET /procurement/purchase-invoices/{id} → PurchaseInvoiceDetail */
export function getPurchaseInvoice(id, signal) {
  return apiRequest(`/procurement/purchase-invoices/${encodeURIComponent(id)}`, { signal });
}

/**
 * PROPOSED: POST /procurement/purchase-invoices/{id}/payments → PurchaseInvoiceDetail.
 * The backend sets "partially_paid", or "paid" once cumulative payments equal the net payable.
 */
export function recordInvoicePayment(id, payload, { idempotencyKey }) {
  return apiRequest(`/procurement/purchase-invoices/${encodeURIComponent(id)}/payments`, { method: "POST", body: payload, idempotencyKey });
}

/** PROPOSED: POST /procurement/attachments (multipart). Returns `{ id, fileName, sizeBytes, contentType }`. */
export function uploadAttachment(file, { idempotencyKey, purpose }) {
  const body = new FormData();
  body.append("file", file);
  body.append("purpose", purpose);
  return apiRequest("/procurement/attachments", { method: "POST", body, idempotencyKey });
}

/** PROPOSED: POST /procurement/purchase-invoices (created as "draft") */
export function createPurchaseInvoice(payload, { idempotencyKey }) {
  return apiRequest("/procurement/purchase-invoices", { method: "POST", body: payload, idempotencyKey });
}
