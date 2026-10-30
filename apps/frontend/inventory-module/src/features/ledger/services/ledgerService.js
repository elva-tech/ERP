import { apiRequest } from "../../../lib/apiClient.js";

export const ledgerService = {
  async getLedger(params = {}, signal) {
    return apiRequest("/ledger", { query: params, signal });
  },
};

