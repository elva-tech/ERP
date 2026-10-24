/** Saves a server-generated file returned by `apiRequest(..., { responseType: "blob" })`. */
export function downloadFile({ blob, fileName }, fallbackName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName ?? fallbackName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
