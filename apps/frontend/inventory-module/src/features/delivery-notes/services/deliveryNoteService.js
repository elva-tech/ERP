import { apiRequest, createIdempotencyKey } from "../../../lib/apiClient.js";

export const deliveryNoteService = {
  async getDeliveryNotes(params = {}, signal) {
    return apiRequest("/delivery-notes", { query: params, signal });
  },

  async createDeliveryNote(deliveryNoteData, options = {}, signal) {
    const idempotencyKey = typeof options === "string" ? options : options?.idempotencyKey || createIdempotencyKey();
    const actualSignal = signal || (typeof options === "object" && options?.signal ? options.signal : undefined);
    return apiRequest("/delivery-notes", {
      method: "POST",
      body: deliveryNoteData,
      idempotencyKey,
      signal: actualSignal,
    });
  },

  async updateDeliveryNoteStatus(id, status, signal) {
    return apiRequest(`/delivery-notes/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: { status },
      signal,
    });
  },
};
