import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Private file storage for employee documents. Files are written under
 * DOCUMENT_STORAGE_DIR (default: <app>/storage/documents, outside the public
 * folder) with server-generated names and are only served through the
 * authenticated document API. Production needs a durable, backed-up private
 * volume mounted at DOCUMENT_STORAGE_DIR.
 */

const HARD_LIMIT = 25 * 1024 * 1024;
const configuredLimit = Number(process.env.DOCUMENT_MAX_BYTES);
export const MAX_DOCUMENT_BYTES =
  Number.isInteger(configuredLimit) && configuredLimit > 0 ? Math.min(configuredLimit, HARD_LIMIT) : 5 * 1024 * 1024;

const ROOT = path.resolve(process.env.DOCUMENT_STORAGE_DIR || path.join(process.cwd(), "storage", "documents"));

const SIGNATURES = [
  { mime: "application/pdf", ext: "pdf", bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] },
  { mime: "image/png", ext: "png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: "image/jpeg", ext: "jpg", bytes: [0xff, 0xd8, 0xff] },
];

/** Detects the file type from its content; the client-declared type is ignored. */
export function detectType(buffer) {
  return SIGNATURES.find((sig) => sig.bytes.every((byte, i) => buffer[i] === byte)) ?? null;
}

function resolveKey(key) {
  if (!/^[0-9]+\/[0-9a-f-]{36}\.(pdf|png|jpg)$/.test(key)) throw new Error("Invalid storage key.");
  const full = path.resolve(ROOT, key);
  if (!full.startsWith(ROOT + path.sep)) throw new Error("Invalid storage key.");
  return full;
}

export async function storeDocument(companyId, buffer, type) {
  const key = `${companyId}/${randomUUID()}.${type.ext}`;
  const full = resolveKey(key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, buffer, { flag: "wx", mode: 0o600 });
  return { key, sha256: createHash("sha256").update(buffer).digest("hex") };
}

export async function readDocument(key) {
  return readFile(resolveKey(key));
}

/** Removes a file whose database row could not be written. */
export async function discardDocument(key) {
  await unlink(resolveKey(key)).catch(() => {});
}

/** Filename safe for a Content-Disposition header. */
export function safeFilename(name) {
  const cleaned = String(name || "document")
    .replace(/[\\/:*?"<>|\r\n\t]+/g, "_")
    .replace(/[^\x20-\x7E]/g, "_")
    .trim()
    .slice(0, 150);
  return cleaned || "document";
}
