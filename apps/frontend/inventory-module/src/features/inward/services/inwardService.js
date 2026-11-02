import { apiRequest, createIdempotencyKey } from "../../../lib/apiClient.js";

export const inwardService = {
  async getInwardEntries(params = {}, signal) {
    return apiRequest("/inward", { query: params, signal });
  },

  async getInwardById(id, signal) {
    return apiRequest(`/inward/${id}`, { signal });
  },

  async createInward(inwardData, options = {}, signal) {
    const { idempotencyKey = createIdempotencyKey() } = options;
    return apiRequest("/inward", {
      method: "POST",
      body: inwardData,
      idempotencyKey,
      signal,
    });
  },

  /**
   * Update an existing inward entry while preserving its authoritative GRN number.
   * Route: PUT /inward/:id
   */
  async updateInward(id, inwardData, options = {}, signal) {
    const { idempotencyKey = createIdempotencyKey() } = options;
    return apiRequest(`/inward/${id}`, {
      method: "PUT",
      body: inwardData,
      idempotencyKey,
      signal,
    });
  },
};
