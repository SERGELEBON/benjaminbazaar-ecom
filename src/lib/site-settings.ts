/**
 * Site settings edited by super admins (server only).
 * Values are validated on write AND merged with defaults on read, so a bad or
 * missing row can never break the home page.
 */
import { db } from "@/lib/db";
import { ValidationError } from "@/lib/errors";
import { cleanText } from "@/lib/sanitize";
import { HERO_DEFAULTS, type HeroSettings } from "@/lib/hero";
import { SUPABASE_URL } from "@/lib/supabase/env";

export const SITE_MEDIA_BUCKET = "site-media";
export const HERO_VIDEO_TYPES: Record<string, string> = { "video/mp4": "mp4", "video/webm": "webm" };
export const HERO_IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export const HERO_VIDEO_MAX = 50 * 1024 * 1024;
export const HERO_IMAGE_MAX = 5 * 1024 * 1024;

/** Public URL prefix of our own media bucket. */
export const siteMediaPrefix = () => `${SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/public/${SITE_MEDIA_BUCKET}/`;

/**
 * Media URLs allowed in the hero: our bundled defaults (/hero/…), our own bucket,
 * or another https URL (super admins may paste a hosted video). Never javascript:/data:.
 */
function mediaUrl(v: unknown, field: string, fallback: string): string {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return fallback;
  if (s.length > 600) throw new ValidationError(`${field} : lien trop long.`);
  if (/^\/hero\/[A-Za-z0-9._-]+$/.test(s)) return s;
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    throw new ValidationError(`${field} : lien invalide.`);
  }
  if (u.protocol !== "https:") throw new ValidationError(`${field} : le lien doit commencer par https://`);
  return u.toString();
}

export function parseHero(body: Record<string, unknown>): HeroSettings {
  const overlay = Number(body.overlay);
  return {
    videoUrl: mediaUrl(body.videoUrl, "Vidéo", HERO_DEFAULTS.videoUrl),
    posterUrl: mediaUrl(body.posterUrl, "Image de couverture", HERO_DEFAULTS.posterUrl),
    badge: cleanText(body.badge, 40),
    title: cleanText(body.title, 90) || HERO_DEFAULTS.title,
    highlight: cleanText(body.highlight, 60),
    subtitle: cleanText(body.subtitle, 220),
    overlay: Number.isFinite(overlay) ? Math.min(85, Math.max(0, Math.round(overlay))) : HERO_DEFAULTS.overlay,
  };
}

export async function getHeroSettings(): Promise<HeroSettings> {
  try {
    const row = await db.siteSetting.findUnique({ where: { key: "hero" } });
    if (!row) return HERO_DEFAULTS;
    return { ...HERO_DEFAULTS, ...parseHero(JSON.parse(row.value) as Record<string, unknown>) };
  } catch {
    return HERO_DEFAULTS;
  }
}

export async function saveHeroSettings(input: HeroSettings, actorId: string) {
  await db.siteSetting.upsert({
    where: { key: "hero" },
    create: { key: "hero", value: JSON.stringify(input), updatedById: actorId },
    update: { value: JSON.stringify(input), updatedById: actorId },
  });
}

/** Storage path for a new upload (random, in the hero/ folder allowed by the bucket policy). */
export function newHeroMediaPath(contentType: string, size: number) {
  const isVideo = contentType in HERO_VIDEO_TYPES;
  const ext = HERO_VIDEO_TYPES[contentType] ?? HERO_IMAGE_TYPES[contentType];
  if (!ext) throw new ValidationError("Format non accepté : vidéo MP4/WebM ou image JPG/PNG/WebP.");
  const max = isVideo ? HERO_VIDEO_MAX : HERO_IMAGE_MAX;
  if (!Number.isFinite(size) || size <= 0) throw new ValidationError("Fichier vide.");
  if (size > max) throw new ValidationError(`Fichier trop lourd (${isVideo ? "50" : "5"} Mo maximum).`);
  return `hero/${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
}
