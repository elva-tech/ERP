import { apiRequest } from "../../../lib/apiClient.js";

/**
 * Supplier Service for Inventory Integration.
 * Reuses the existing Procurement Supplier Master API contract:
 * GET /procurement/suppliers -> { items: SupplierListItem[], pagination: {...} }
 */
export const supplierService = {
  /**
   * List suppliers from Procurement Master.
   * @param {Object} [params]
   * @param {string} [params.search] Search query (name or supplier code)
   * @param {string} [params.status="active"] Filter by supplier status
   * @param {number} [params.page]
   * @param {number} [params.pageSize]
   * @param {AbortSignal} [signal]
   */
  async getSuppliers(params = {}, signal) {
    const query = {
      status: params.status ?? "active",
      ...(params.search ? { search: params.search } : {}),
      ...(params.page ? { page: params.page } : {}),
      ...(params.pageSize ? { pageSize: params.pageSize } : {}),
    };

    const res = await apiRequest("/procurement/suppliers", { query, signal });
    // The official Procurement API contract returns { items: [...], pagination: {...} }.
    // We normalize this defensively so that callers receive { items, pagination, data }.
    const items = Array.isArray(res?.items)
      ? res.items
      : Array.isArray(res?.data)
      ? res.data
      : Array.isArray(res)
      ? res
      : [];

    return {
      items,
      pagination: res?.pagination ?? {
        page: query.page ?? 1,
        pageSize: query.pageSize ?? items.length,
        totalItems: res?.total ?? items.length,
        totalPages: 1,
      },
      data: items, // Alias for backward compatibility
    };
  },

  /**
   * Fetch single supplier by identifier from Procurement Master.
   * @param {string} supplierId
   * @param {AbortSignal} [signal]
   */
  async getSupplierById(supplierId, signal) {
    return apiRequest(`/procurement/suppliers/${supplierId}`, { signal });
  },
};
