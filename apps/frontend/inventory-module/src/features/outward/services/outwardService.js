import { apiRequest, createIdempotencyKey } from "../../../lib/apiClient.js";

export const outwardService = {
  async getOutwardEntries(params = {}, signal) {
    return apiRequest("/outward", { query: params, signal });
  },

  async getOutwardById(id, signal) {
    return apiRequest(`/outward/${id}`, { signal });
  },

  async createOutward(outwardData, options = {}, signal) {
    const { idempotencyKey = createIdempotencyKey() } = options;
    return apiRequest("/outward", {
      method: "POST",
      body: outwardData,
      idempotencyKey,
      signal,
    });
  },
};

