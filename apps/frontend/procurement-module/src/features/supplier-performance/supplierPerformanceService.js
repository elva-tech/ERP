import { apiRequest } from "../../lib/apiClient.js";

/**
 * Every score below is calculated by the backend from GRN, quality-inspection and response records.
 * The frontend only formats them. Formulas and weighting are UNRESOLVED (PRD §5.5).
 *
 * @typedef {Object} SupplierPerformanceRow
 * @property {{ id: string, name: string }} supplier
 * @property {"sufficient" | "insufficient"} dataSufficiency
 * @property {string | null} onTimeRate        Decimal string, percent (e.g. "98.4").
 * @property {string | null} qualityScore      Decimal string out of 100.
 * @property {string | null} rejectionRate     Decimal string, percent.
 * @property {string | null} avgResponseHours  Decimal string, hours.
 * @property {string | null} overallRating     Decimal string, 0-5.
 * @property {number | null} filledStars       Whole stars to draw, decided by the backend.
 *
 * @typedef {Object} SupplierPerformanceResponse
 * @property {string | null} lastUpdatedAt
 * @property {{ id: string, label: string } | null} period
 * @property {{
 *   bestDelivery: { supplier: { id: string, name: string }, onTimeRate: string } | null,
 *   highestQuality: { supplier: { id: string, name: string }, rejectionRate: string } | null,
 *   fastestResponse: { supplier: { id: string, name: string }, avgResponseHours: string } | null,
 * }} highlights
 * @property {SupplierPerformanceRow[]} items
 * @property {import("../../lib/apiTypes.js").Pagination} pagination
 */

/** PROPOSED: GET /procurement/supplier-performance */
export function getSupplierPerformance({ page, pageSize, periodId, categoryId }, signal) {
  return apiRequest("/procurement/supplier-performance", {
    query: { page, pageSize, periodId, categoryId },
    signal,
  });
}
