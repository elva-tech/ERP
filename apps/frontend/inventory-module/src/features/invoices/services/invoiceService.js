import { apiRequest, createIdempotencyKey } from "../../../lib/apiClient.js";

export const invoiceService = {
  async getInvoices(params = {}, signal) {
    return apiRequest("/invoices", { query: params, signal });
  },

  async createInvoice(invoiceData, signal) {
    return apiRequest("/invoices", {
      method: "POST",
      body: invoiceData,
      idempotencyKey: createIdempotencyKey(),
      signal,
    });
  },
};

