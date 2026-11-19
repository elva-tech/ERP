import { apiRequest, createIdempotencyKey } from "../../../lib/apiClient.js";

export const itemService = {
  async getItems(params = {}, signal) {
    return apiRequest("/items", { query: params, signal });
  },

  async getItemById(id, signal) {
    return apiRequest(`/items/${id}`, { signal });
  },

  async createItem(itemData, options = {}, signal) {
    const { idempotencyKey = createIdempotencyKey() } = options;
    return apiRequest("/items", {
      method: "POST",
      body: itemData,
      idempotencyKey,
      signal,
    });
  },

  async updateItem(id, updateData, signal) {
    return apiRequest(`/items/${id}`, {
      method: "PATCH",
      body: updateData,
      signal,
    });
  },
};

