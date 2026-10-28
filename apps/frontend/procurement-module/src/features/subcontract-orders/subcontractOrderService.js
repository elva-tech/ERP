import { apiRequest } from "../../lib/apiClient.js";

/**
 * @typedef {"draft" | "active" | "completed" | "cancelled"} SubcontractOrderStatus
 *
 * @typedef {Object} SubcontractOrderListItem
 * @property {string} id
 * @property {string} orderNumber
 * @property {string} orderDate
 * @property {{ id: string, name: string }} subcontractor
 * @property {{ id: string, agreementNumber: string } | null} agreement
 * @property {string | null} description
 * @property {string} orderValue
 * @property {string | null} deliveryDate
 * @property {string | null} progressPercent  Reported by the backend (measurement basis UNRESOLVED).
 * @property {SubcontractOrderStatus} status
 */

/** PROPOSED: GET /procurement/subcontract-orders */
export function listSubcontractOrders({ page, pageSize, status }, signal) {
  return apiRequest("/procurement/subcontract-orders", { query: { page, pageSize, status }, signal });
}
