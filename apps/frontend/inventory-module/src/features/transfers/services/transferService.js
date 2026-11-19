import { apiRequest, createIdempotencyKey } from "../../../lib/apiClient.js";

export const transferService = {
  async getTransfers(params = {}, signal) {
    return apiRequest("/transfers", { query: params, signal });
  },

  async createTransfer(transferData, signal) {
    return apiRequest("/transfers", {
      method: "POST",
      body: transferData,
      idempotencyKey: createIdempotencyKey(),
      signal,
    });
  },
};

