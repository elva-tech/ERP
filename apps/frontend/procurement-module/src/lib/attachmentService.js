import { apiRequest } from "./apiClient.js";

/** PROPOSED: GET /procurement/attachments/{id}/file */
export function downloadAttachmentFile(id) {
  return apiRequest(`/procurement/attachments/${encodeURIComponent(id)}/file`, { responseType: "blob" });
}
