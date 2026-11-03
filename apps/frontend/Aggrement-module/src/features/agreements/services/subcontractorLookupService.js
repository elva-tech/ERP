/**
 * Subcontractor & Supplier Master Lookup Service
 * Reuses existing Procurement master-data APIs and contracts.
 */

import { apiRequest } from "../../../lib/apiClient.js";
import { isMockMode } from "../../../lib/env.js";
import { mockListSubcontractors } from "../../../mock-api/mockAdapter.js";

/**
 * Fetch authorized subcontractor master options from Procurement infrastructure.
 * Reuses existing Procurement lookups (`/procurement/lookups/subcontractors`)
 * and maps `SupplierListItem` or `SubcontractorListItem` structures preserving actual IDs.
 *
 * @param {Object} [params]
 * @param {string} [params.search] Optional search string
 * @param {AbortSignal} [signal]
 * @returns {Promise<Array<{ value: string, label: string, subtext?: string }>>}
 */
export async function listSubcontractorOptions(params = {}, signal) {
  if (isMockMode()) {
    return mockListSubcontractors();
  }

  // 1. Primary Procurement Lookup Contract: GET /procurement/lookups/subcontractors
  try {
    const lookupRes = await apiRequest("/procurement/lookups/subcontractors", {
      method: "GET",
      query: params?.search ? { search: params.search } : undefined,
      signal,
    });

    if (Array.isArray(lookupRes?.options)) {
      return lookupRes.options.map((opt) => ({
        value: String(opt.value || opt.id),
        label: String(opt.label || opt.name),
        subtext: opt.subtext || opt.category || opt.code || undefined,
      }));
    }
  } catch (err) {
    // If specific lookup key 404s, attempt direct master list fallback
    if (err?.status !== 404) {
      throw err;
    }
  }

  // 2. Secondary Procurement Subcontractor Master: GET /procurement/subcontractors
  try {
    const listRes = await apiRequest("/procurement/subcontractors", {
      method: "GET",
      query: { page: 1, pageSize: 100, search: params?.search || undefined },
      signal,
    });

    if (Array.isArray(listRes?.items)) {
      return listRes.items
        .filter((sub) => sub.status !== "inactive" && sub.status !== "suspended")
        .map((sub) => ({
          value: String(sub.id),
          label: String(sub.name),
          subtext: sub.tradeSpecialtyLabel || sub.code || undefined,
        }));
    }
  } catch (err) {
    if (err?.status !== 404) {
      throw err;
    }
  }

  // 3. Tertiary Procurement Supplier Master: GET /procurement/suppliers
  const supplierRes = await apiRequest("/procurement/suppliers", {
    method: "GET",
    query: { page: 1, pageSize: 100, search: params?.search || undefined },
    signal,
  });

  if (Array.isArray(supplierRes?.items)) {
    return supplierRes.items
      .filter((s) => s.status !== "inactive")
      .map((s) => ({
        value: String(s.id),
        label: String(s.name),
        subtext: s.categoryName || s.code || undefined,
      }));
  }

  return [];
}
