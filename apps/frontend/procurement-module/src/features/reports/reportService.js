import { apiRequest } from "../../lib/apiClient.js";

/**
 * @typedef {Object} ReportDefinition
 * @property {string} key
 * @property {string} title
 * @property {string} description
 * @property {Array<"pdf" | "xlsx">} formats
 *
 * @typedef {Object} GeneratedReport
 * @property {string} id
 * @property {string} fileName
 * @property {string} generatedAt
 * @property {number | null} sizeBytes
 * @property {"pdf" | "xlsx"} format
 * @property {"ready" | "processing" | "failed"} status
 */

/** PROPOSED: GET /procurement/reports/definitions?group=purchase */
export function listReportDefinitions(group, signal) {
  return apiRequest("/procurement/reports/definitions", { query: { group }, signal });
}

/** PROPOSED: GET /procurement/reports/generated */
export function listGeneratedReports({ page, pageSize }, signal) {
  return apiRequest("/procurement/reports/generated", { query: { page, pageSize }, signal });
}

/** PROPOSED: POST /procurement/reports/generate — generation may be asynchronous (status "processing"). */
export function generateReport({ reportKey, periodId, format }, { idempotencyKey }) {
  return apiRequest("/procurement/reports/generate", {
    method: "POST",
    body: { reportKey, periodId: periodId || null, format },
    idempotencyKey,
  });
}

/** PROPOSED: GET /procurement/reports/generated/{id}/file */
export function downloadGeneratedReport(reportId) {
  return apiRequest(`/procurement/reports/generated/${encodeURIComponent(reportId)}/file`, { responseType: "blob" });
}

/** PROPOSED: GET /procurement/reports/supplier-overview */
export function getSupplierReportOverview(signal) {
  return apiRequest("/procurement/reports/supplier-overview", { signal });
}

/** PROPOSED: GET /procurement/reports/spend-analysis */
export function getSpendAnalysis({ periodId }, signal) {
  return apiRequest("/procurement/reports/spend-analysis", { query: { periodId }, signal });
}
