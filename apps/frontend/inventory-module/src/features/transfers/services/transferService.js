import { apiRequest, createIdempotencyKey } from "../../../lib/apiClient.js";

export const transferService = {
  async getTransfers(params = {}, signal) {
    return apiRequest("/transfers", { query: params, signal });
  },

  async createTransfer(transferData, options = {}, signal) {
    const idempotencyKey = typeof options === "string" ? options : options?.idempotencyKey || createIdempotencyKey();
    const actualSignal = signal || (typeof options === "object" && options?.signal ? options.signal : undefined);
    return apiRequest("/transfers", {
      method: "POST",
      body: transferData,
      idempotencyKey,
      signal: actualSignal,
    });
  },
};
