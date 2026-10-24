import { apiRequest } from "../../lib/apiClient.js";

/**
 * @typedef {"active" | "suspended" | "inactive"} SubcontractorStatus
 * Whether "blacklisted" is a separate status is UNRESOLVED.
 *
 * @typedef {Object} SubcontractorListItem
 * @property {string} id
 * @property {string} code
 * @property {string} name
 * @property {string | null} tradeSpecialtyLabel
 * @property {string | null} gstin
 * @property {string | null} contactPerson
 * @property {string | null} phone
 * @property {number} activeAgreementCount
 * @property {string | null} rating   Decimal string 0-5, maintained by the backend.
 * @property {SubcontractorStatus} status
 */

/** PROPOSED: GET /procurement/subcontractors */
export function listSubcontractors({ page, pageSize, search }, signal) {
  return apiRequest("/procurement/subcontractors", { query: { page, pageSize, search }, signal });
}

/** PROPOSED: GET /procurement/subcontractors/summary */
export function getSubcontractorSummary(signal) {
  return apiRequest("/procurement/subcontractors/summary", { signal });
}

/** PROPOSED: POST /procurement/subcontractors */
export function createSubcontractor(payload, { idempotencyKey }) {
  return apiRequest("/procurement/subcontractors", { method: "POST", body: payload, idempotencyKey });
}
