import { apiRequest } from "../../lib/apiClient.js";

/**
 * @typedef {"submitted" | "verified" | "approved" | "paid"} SubcontractBillStatus
 *
 * @typedef {Object} SubcontractBillListItem
 * @property {string} id
 * @property {string} billNumber
 * @property {string} billDate
 * @property {{ id: string, name: string }} subcontractor
 * @property {{ id: string, orderNumber: string } | null} order
 * @property {string} billAmount
 * @property {string} retentionAmount   Backend-calculated.
 * @property {string} netPayable        Backend-calculated.
 * @property {string} cumulativePaid    Backend-calculated.
 * @property {SubcontractBillStatus} status
 *
 * List responses may include `retentionRatePercent` when a single rate applies to the page (UNRESOLVED).
 */

/** PROPOSED: GET /procurement/subcontract-bills — `search` matches billNumber, subcontractor name, order orderNumber (mock implements; production TBD). */
export function listSubcontractBills({ page, pageSize, status, search }, signal) {
  return apiRequest("/procurement/subcontract-bills", { query: { page, pageSize, status, search }, signal });
}

/** PROPOSED: GET /procurement/subcontract-bills/summary */
export function getSubcontractBillSummary(signal) {
  return apiRequest("/procurement/subcontract-bills/summary", { signal });
}
