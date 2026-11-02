import { apiRequest, createIdempotencyKey } from "../../../lib/apiClient.js";

/**
 * Reconciliation Service
 */
export const reconciliationService = {
  async getReconciliations(params = {}, signal) {
    return apiRequest("/reconciliations", { query: params, signal });
  },

  async startReconciliation(reconciliationData, options = {}, signal) {
    const idempotencyKey = typeof options === "string" ? options : options?.idempotencyKey || createIdempotencyKey();
    const actualSignal = signal || (typeof options === "object" && options?.signal ? options.signal : undefined);
    return apiRequest("/reconciliations", {
      method: "POST",
      body: reconciliationData,
      idempotencyKey,
      signal: actualSignal,
    });
  },

  /**
   * Post inventory adjustment for a reconciliation variance.
   * Authoritative backend route: POST /reconciliations/:id/adjust
   * @param {string} id Reconciliation record ID
   * @param {Object} [payload] Adjustment details
   * @param {Object|string} [options]
   * @param {AbortSignal} [signal]
   */
  async adjustStock(id, payload = {}, options = {}, signal) {
    const idempotencyKey = typeof options === "string" ? options : options?.idempotencyKey || createIdempotencyKey();
    const actualSignal = signal || (typeof options === "object" && options?.signal ? options.signal : undefined);
    return apiRequest(`/reconciliations/${encodeURIComponent(id)}/adjust`, {
      method: "POST",
      body: payload,
      idempotencyKey,
      signal: actualSignal,
    });
  },
};
