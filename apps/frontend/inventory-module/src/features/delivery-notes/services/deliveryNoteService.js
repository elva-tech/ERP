import { apiRequest, createIdempotencyKey } from "../../../lib/apiClient.js";

export const deliveryNoteService = {
  async getDeliveryNotes(params = {}, signal) {
    return apiRequest("/delivery-notes", { query: params, signal });
  },

  async createDeliveryNote(deliveryNoteData, signal) {
    return apiRequest("/delivery-notes", {
      method: "POST",
      body: deliveryNoteData,
      idempotencyKey: createIdempotencyKey(),
      signal,
    });
  },
};

