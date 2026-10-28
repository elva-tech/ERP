import { apiRequest } from "../../lib/apiClient.js";

/**
 * @typedef {"active" | "completed" | "expired"} SubcontractAgreementStatus
 * `expired` is derived when the end date has passed; `completed` is set manually from View.
 *
 * @typedef {Object} SubcontractAgreementListItem
 * @property {string} id
 * @property {string} agreementNumber
 * @property {string} agreementDate
 * @property {{ id: string, name: string }} subcontractor
 * @property {string | null} projectName
 * @property {string | null} scopeSummary
 * @property {string} agreementValue
 * @property {string} startDate
 * @property {string} endDate
 * @property {SubcontractAgreementStatus} status
 *
 * @typedef {SubcontractAgreementListItem & {
 *   title: string,
 *   scopeOfWork: string,
 *   termsAndConditions: string | null,
 *   paymentScheduleLabel: string | null,
 *   attachments: Array<{ id: string, fileName: string, contentType: string }>,
 *   allowedActions: Array<"complete">,
 * }} SubcontractAgreementDetail
 */

/** PROPOSED: GET /procurement/subcontract-agreements */
export function listSubcontractAgreements({ page, pageSize, status }, signal) {
  return apiRequest("/procurement/subcontract-agreements", { query: { page, pageSize, status }, signal });
}

/** PROPOSED: GET /procurement/subcontract-agreements/summary */
export function getSubcontractAgreementSummary(signal) {
  return apiRequest("/procurement/subcontract-agreements/summary", { signal });
}

/** PROPOSED: GET /procurement/subcontract-agreements/{id} → SubcontractAgreementDetail */
export function getSubcontractAgreement(id, signal) {
  return apiRequest(`/procurement/subcontract-agreements/${encodeURIComponent(id)}`, { signal });
}

/** PROPOSED: POST /procurement/subcontract-agreements/{id}/status-changes `{ status: "completed" }` → SubcontractAgreementDetail */
export function changeSubcontractAgreementStatus(id, payload, { idempotencyKey }) {
  return apiRequest(`/procurement/subcontract-agreements/${encodeURIComponent(id)}/status-changes`, {
    method: "POST",
    body: payload,
    idempotencyKey,
  });
}

/** PROPOSED: POST /procurement/subcontract-agreements */
export function createSubcontractAgreement(payload, { idempotencyKey }) {
  return apiRequest("/procurement/subcontract-agreements", { method: "POST", body: payload, idempotencyKey });
}

/** PROPOSED: POST /procurement/attachments (multipart). Returns `{ id, fileName, sizeBytes, contentType }`. */
export function uploadAgreementAttachment(file, { idempotencyKey }) {
  const body = new FormData();
  body.append("file", file);
  body.append("purpose", "subcontract_agreement");
  return apiRequest("/procurement/attachments", { method: "POST", body, idempotencyKey });
}
