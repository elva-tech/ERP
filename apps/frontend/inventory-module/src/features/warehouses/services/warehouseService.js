import { apiRequest, createIdempotencyKey } from "../../../lib/apiClient.js";

export const warehouseService = {
  async getWarehouses(params = {}, signal) {
    return apiRequest("/warehouses", { query: params, signal });
  },

  async getWarehouseById(id, signal) {
    return apiRequest(`/warehouses/${id}`, { signal });
  },

  async createWarehouse(warehouseData, options = {}, signal) {
    const { idempotencyKey = createIdempotencyKey() } = options;
    return apiRequest("/warehouses", {
      method: "POST",
      body: warehouseData,
      idempotencyKey,
      signal,
    });
  },
};

