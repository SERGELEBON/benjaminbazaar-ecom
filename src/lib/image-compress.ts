"use client";

export const CHAT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_SIDE = 1920;
const TARGET_BYTES = 1.5 * 1024 * 1024;
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export interface PreparedImage {
  file: File;
  width: number;
  height: number;
  previewUrl: string;
}

/**
 * Validates and, when useful, downsizes an image in the browser before upload
 * (phone photos are often 4-12 MB). Output is JPEG/PNG/WebP <= 4 MB.
 * The server re-validates everything (magic bytes, size): this is only UX.
 */
export async function prepareImage(input: File): Promise<PreparedImage> {
  if (!input.type.startsWith("image/")) throw new Error("Seules les images sont acceptées (JPEG, PNG, WebP).");

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(input);
  } catch {
    throw new Error("Image illisible ou format non pris en charge (JPEG, PNG, WebP).");
  }
  const { width, height } = bitmap;
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
  const supported = (CHAT_IMAGE_TYPES as readonly string[]).includes(input.type);

  let file = input;
  let outW = width;
  let outH = height;
  if (!supported || scale < 1 || input.size > TARGET_BYTES) {
    outW = Math.round(width * scale);
    outH = Math.round(height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Traitement de l'image impossible sur cet appareil.");
    // Keep transparency for PNGs, otherwise JPEG (best size/quality for photos).
    const keepPng = input.type === "image/png" && input.size <= TARGET_BYTES * 2;
    if (!keepPng) {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, outW, outH);
    }
    ctx.drawImage(bitmap, 0, 0, outW, outH);
    const type = keepPng ? "image/png" : "image/jpeg";
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, type, 0.85));
    if (!blob) throw new Error("Compression de l'image impossible.");
    const base = (input.name || "photo").replace(/\.[^.]+$/, "");
    file = new File([blob], `${base}.${type === "image/png" ? "png" : "jpg"}`, { type });
  }
  bitmap.close();

  if (file.size > MAX_UPLOAD_BYTES) throw new Error("Image trop lourde (4 Mo max après compression).");
  return { file, width: outW, height: outH, previewUrl: URL.createObjectURL(file) };
}
