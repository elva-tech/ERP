export const MAX_WAREHOUSE_PDF_BYTES = 5 * 1024 * 1024;

const PDF_MIME_TYPES = new Set(["application/pdf", "application/x-pdf"]);

export function isPdfFile(file) {
  if (!file) return false;
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  if (PDF_MIME_TYPES.has(type)) return true;
  if (!name.endsWith(".pdf")) return false;
  return type === "" || type === "application/octet-stream";
}

export function validateWarehousePdfFile(file) {
  if (!file) return null;
  if (!isPdfFile(file)) {
    return "Select a PDF file. Other file types are not allowed.";
  }
  if (file.size > MAX_WAREHOUSE_PDF_BYTES) {
    return `PDF must be ${Math.round(MAX_WAREHOUSE_PDF_BYTES / (1024 * 1024))} MB or smaller.`;
  }
  return null;
}

/** Backend-ready attachment reference (binary upload handled separately in real mode). */
export function buildWarehouseDocumentAttachment(file) {
  const error = validateWarehousePdfFile(file);
  if (error) {
    throw new Error(error);
  }
  return {
    id: `wh-doc-${Date.now()}`,
    fileName: file.name,
    mimeType: "application/pdf",
    sizeBytes: file.size,
    uploadedAt: new Date().toISOString(),
  };
}