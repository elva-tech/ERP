import { apiRequest } from "../../../lib/apiClient.js";

export const agingService = {
  async getAgingAnalysis(params = {}, signal) {
    return apiRequest("/aging", { query: params, signal });
  },
};

