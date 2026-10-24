import { apiRequest } from "../../lib/apiClient.js";

/**
 * Every figure is aggregated by the backend for the signed-in user's scope.
 *
 * @typedef {Object} ProcurementDashboard
 * @property {{ purchaseValue: string | null, pendingRequisitions: number | null, pendingOrders: number | null,
 *   pendingApprovals: number | null, supplierPayables: string | null, monthlySpend: string | null }} kpis
 * @property {Array<{ periodKey: string, label: string, amount: string }>} monthlySpend
 * @property {{ totalAmount: string, categories: Array<{ id: string, name: string, sharePercent: string }> }} categoryBreakdown
 * @property {Array<{ id: string, orderNumber: string, supplierName: string, totalAmount: string, orderDate: string, status: string }>} recentOrders
 * @property {Array<{ id: string, document: { type: string, id: string, number: string }, title: string, subtitle: string | null, amount: string }>} pendingApprovals
 */

/** PROPOSED: GET /procurement/dashboard */
export function getDashboard(signal) {
  return apiRequest("/procurement/dashboard", { signal });
}
