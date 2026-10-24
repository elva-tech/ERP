import { apiRequest } from "../../lib/apiClient.js";

/**
 * Approval routing, thresholds and authority are decided by the backend (PRD §5.7 UNRESOLVED).
 *
 * @typedef {"purchaseRequisition" | "purchaseOrder" | "subcontractBill" | "purchaseInvoice"} ApprovalDocumentType
 *
 * @typedef {Object} PendingApprovalItem
 * @property {string} id                 Approval request id.
 * @property {ApprovalDocumentType} documentType
 * @property {string} documentTypeLabel
 * @property {{ id: string, number: string }} document
 * @property {{ id: string, displayName: string }} requestedBy
 * @property {string} submittedAt        ISO date.
 * @property {string | null} amount
 * @property {"high" | "medium" | "low" | null} priority
 * @property {string | null} description
 * @property {{ approve: boolean, reject: boolean }} allowedActions
 *
 * @typedef {Object} ApprovalHistoryItem
 * @property {string} id
 * @property {string} documentTypeLabel
 * @property {ApprovalDocumentType} documentType
 * @property {{ id: string, number: string }} document
 * @property {{ id: string, displayName: string }} requestedBy
 * @property {string | null} amount
 * @property {string} submittedAt
 * @property {string} decidedAt
 * @property {{ id: string, displayName: string }} decidedBy
 * @property {"approved" | "rejected"} decision
 * @property {string | null} comment
 */

/** PROPOSED: GET /procurement/approvals/pending — response also carries `totalPending` for the header badge. */
export function listPendingApprovals({ page, pageSize, documentType }, signal) {
  return apiRequest("/procurement/approvals/pending", { query: { page, pageSize, documentType }, signal });
}

/** PROPOSED: POST /procurement/approvals/{id}/decisions */
export function decideApproval(approvalId, { decision, comment, expectedVersion }, { idempotencyKey }) {
  return apiRequest(`/procurement/approvals/${encodeURIComponent(approvalId)}/decisions`, {
    method: "POST",
    body: { decision, comment: comment || null, expectedVersion: expectedVersion ?? null },
    idempotencyKey,
  });
}

/** PROPOSED: GET /procurement/approvals/history */
export function listApprovalHistory({ page, pageSize, documentType, decision, dateRange }, signal) {
  return apiRequest("/procurement/approvals/history", { query: { page, pageSize, documentType, decision, dateRange }, signal });
}

/** PROPOSED: GET /procurement/approvals/history/export — server-generated file with the same filters. */
export function exportApprovalHistory({ documentType, decision, dateRange }) {
  return apiRequest("/procurement/approvals/history/export", {
    query: { documentType, decision, dateRange, format: "xlsx" },
    responseType: "blob",
  });
}
