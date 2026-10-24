import { apiRequest } from "../../lib/apiClient.js";

/**
 * @typedef {"active" | "completed" | "expired"} SubcontractAgreementStatus
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
 */

/** PROPOSED: GET /procurement/subcontract-agreements */
export function listSubcontractAgreements({ page, pageSize, status }, signal) {
  return apiRequest("/procurement/subcontract-agreements", { query: { page, pageSize, status }, signal });
}

/** PROPOSED: GET /procurement/subcontract-agreements/summary */
export function getSubcontractAgreementSummary(signal) {
  return apiRequest("/procurement/subcontract-agreements/summary", { signal });
}

/** PROPOSED: POST /procurement/subcontract-agreements */
export function createSubcontractAgreement(payload, { idempotencyKey }) {
  return apiRequest("/procurement/subcontract-agreements", { method: "POST", body: payload, idempotencyKey });
}
