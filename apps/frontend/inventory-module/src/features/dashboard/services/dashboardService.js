import { apiRequest } from "../../../lib/apiClient.js";

export const dashboardService = {
  async getDashboardMetrics(signal) {
    return apiRequest("/dashboard", { signal });
  },
};

