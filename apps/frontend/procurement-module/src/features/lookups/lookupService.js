import { apiRequest } from "../../lib/apiClient.js";

/**
 * PROPOSED: tenant-scoped option lists (categories, departments, payment terms, projects, ...).
 * Option values and labels are owned by the backend; the frontend never hardcodes business lists.
 *
 * Known lookup keys used by this module:
 * supplierCategories, paymentTerms, departments, requisitionPriorities, approvers, units,
 * suppliers, approvedRequisitions, purchaseOrders, returnReasons, subcontractors, projects,
 * tradeSpecialties, paymentSchedules, reportingPeriods, performancePeriods
 *
 * @param {string} lookupKey
 * @param {AbortSignal} [signal]
 * @returns {Promise<{ options: Array<{ value: string, label: string }> }>}
 */
export function getLookupOptions(lookupKey, signal) {
  return apiRequest(`/procurement/lookups/${encodeURIComponent(lookupKey)}`, { signal });
}
