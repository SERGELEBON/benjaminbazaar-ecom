/** Input normalisation shared by server validators (pure, no I/O). */

/** Trimmed single-line string (inner whitespace collapsed), capped to `max`. "" when not a string. */
export const cleanText = (v: unknown, max: number) =>
  typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "";

/** Trimmed multi-line string (keeps line breaks), capped to `max`. */
export const cleanMultiline = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/\r\n?/g, "\n").trim().slice(0, max) : "";

/** Integer from number or numeric string; NaN otherwise. */
export const toInt = (v: unknown) => {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? Math.trunc(n) : NaN;
};

/** Phone numbers as typed in West Africa (+225 07 00 00 00 00, 0700000000…). */
export const isPhone = (v: string) => /^[+()\d\s.-]{8,30}$/.test(v) && v.replace(/\D/g, "").length >= 8;

/** JSON array stored in a text column (images, attributes…); [] when invalid. */
export function parseJsonArray<T = unknown>(s: string | null | undefined): T[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? (v as T[]) : [];
  } catch {
    return [];
  }
}

/** Detects the real image type from its first bytes (never trust the client's MIME type). */
export function sniffImage(buf: Uint8Array): { mime: "image/jpeg" | "image/png" | "image/webp"; ext: string } | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (buf.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => buf[i] === b))
    return { mime: "image/png", ext: "png" };
  if (
    buf.length >= 12 &&
    String.fromCharCode(...buf.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...buf.slice(8, 12)) === "WEBP"
  )
    return { mime: "image/webp", ext: "webp" };
  return null;
}
