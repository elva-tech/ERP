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
};

