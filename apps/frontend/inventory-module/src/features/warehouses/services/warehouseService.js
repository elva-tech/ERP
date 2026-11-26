import { apiRequest, createIdempotencyKey } from "../../../lib/apiClient.js";
import { isMockMode } from "../../../lib/apiConfig.js";
import { buildWarehouseDocumentAttachment } from "../warehouseDocument.js";

export const warehouseService = {
  async getWarehouses(params = {}, signal) {
    return apiRequest("/warehouses", { query: params, signal });
  },

  async getWarehouseById(id, signal) {
    return apiRequest(`/warehouses/${id}`, { signal });
  },

  async createWarehouse(warehouseData, options = {}, signal) {
    const { idempotencyKey = createIdempotencyKey(), document = null } = options;
    let body = warehouseData;

    if (document) {
      if (isMockMode()) {
        body = {
          ...warehouseData,
          documentAttachment: buildWarehouseDocumentAttachment(document),
        };
      } else {
        const formData = new FormData();
        formData.append("data", JSON.stringify(warehouseData));
        formData.append("document", document, document.name);
        body = formData;
      }
    }

    return apiRequest("/warehouses", {
      method: "POST",
      body,
      idempotencyKey,
      signal,
    });
  },
};

