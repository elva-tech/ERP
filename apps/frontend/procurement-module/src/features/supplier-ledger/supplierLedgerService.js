import { apiRequest } from "../../lib/apiClient.js";

/**
 * Ledger ownership is UNRESOLVED (PRD §5.4): procurement subledger, read-only Finance/AP view,
 * or supplier statement. Every amount and balance below is calculated by the backend; the
 * frontend only formats decimal strings.
 */

/**
 * @typedef {Object} LedgerEntry
 * @property {string} id
 * @property {string} documentDate ISO date
 * @property {string} voucherNumber
 * @property {string} voucherType e.g. "opening", "purchase", "payment", "journal"
 * @property {string} description
 * @property {string | null} debitAmount decimal string
 * @property {string | null} creditAmount decimal string
 * @property {string} runningBalance decimal string (absolute value)
 * @property {"cr" | "dr"} runningBalanceSide
 * @property {{ type: string, id: string } | null} sourceDocument
 */

/**
 * @typedef {Object} SupplierLedgerResponse
 * @property {{ id: string, code: string, name: string }} supplier
 * @property {{ fromDate: string, toDate: string }} period
 * @property {{ openingBalance: string, totalDebits: string, totalCredits: string, closingBalance: string }} summary
 * @property {LedgerEntry[]} items
 * @property {{ page: number, pageSize: number, totalItems: number, totalPages: number }} pagination
 */

/** PROPOSED: GET /procurement/suppliers/{supplierId}/ledger */
export function getSupplierLedger({ supplierId, fromDate, toDate, page, pageSize }, signal) {
  return apiRequest(`/procurement/suppliers/${encodeURIComponent(supplierId)}/ledger`, {
    query: { fromDate, toDate, page, pageSize },
    signal,
  });
}

/**
 * @typedef {Object} SupplierStatementResponse
 * @property {{ id: string, code: string, name: string, initials?: string, gstin: string | null, pan: string | null, paymentTermsLabel: string | null }} supplier
 * @property {string} financialYearLabel e.g. "FY 2025 - 26"
 * @property {string} statementPeriodLabel
 * @property {{ totalPurchases: string, totalPayments: string, outstanding: string }} totals
 * @property {LedgerEntry[]} items
 */

/** PROPOSED: GET /procurement/suppliers/{supplierId}/statement */
export function getSupplierStatement({ supplierId }, signal) {
  return apiRequest(`/procurement/suppliers/${encodeURIComponent(supplierId)}/statement`, { signal });
}

/** PROPOSED: GET /procurement/suppliers/{supplierId}/ledger/export?format=xlsx|pdf (permission-aware). */
export function exportSupplierLedger({ supplierId, fromDate, toDate, format }) {
  return apiRequest(`/procurement/suppliers/${encodeURIComponent(supplierId)}/ledger/export`, {
    query: { fromDate, toDate, format },
    responseType: "blob",
  });
}
