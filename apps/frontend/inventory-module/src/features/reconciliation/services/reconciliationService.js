import { apiRequest, createIdempotencyKey } from "../../../lib/apiClient.js";

export const reconciliationService = {
  async getReconciliations(params = {}, signal) {
    return apiRequest("/reconciliations", { query: params, signal });
  },

  async startReconciliation(reconciliationData, signal) {
    return apiRequest("/reconciliations", {
      method: "POST",
      body: reconciliationData,
      idempotencyKey: createIdempotencyKey(),
      signal,
    });
  },
};

