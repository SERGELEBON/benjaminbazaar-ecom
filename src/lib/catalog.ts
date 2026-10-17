/**
 * Merchant catalogue (server only): product validation, ownership and image storage.
 *
 * Product lifecycle (merchant):  draft -> published <-> draft,  any -> archived -> draft
 * Platform moderation (admin):   ok <-> blocked (reason shown to the merchant)
 * Public visibility = published + moderation ok + public shop (see PUBLIC_PRODUCT_WHERE).
 *
 * Prices: merchants type prices in XOF (FCFA). The database base currency is GHS
 * (historical choice of the catalogue), so we convert on write and the UI converts
 * back for display. Conversions are exact enough to round-trip whole FCFA amounts.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { AuthError, authErrorResponse, requireUser } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/supabase/server";
import { CURRENCY_RATES } from "@/lib/format";
import { slugify } from "@/lib/merchant";
import { sniffImage } from "@/lib/chat";
import { SUPABASE_URL } from "@/lib/supabase/env";

export const PRODUCT_BUCKET = "product-images";
export const MAX_PRODUCT_IMAGES = 8;
export const MAX_PRODUCTS_PER_SHOP = 1000;
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const PRODUCT_UNITS = ["pièce", "carton", "lot", "paire", "kg", "tonne", "litre", "mètre", "sac", "boîte", "douzaine"] as const;
export const PRODUCT_STATUSES = ["draft", "published", "archived"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export class CatalogError extends Error {
  constructor(public status: 400 | 403 | 404 | 409 | 413 | 415 | 429 | 503, message: string) {
    super(message);
  }
}

export function catalogErrorResponse(e: unknown) {
  if (e instanceof CatalogError) return NextResponse.json({ error: e.message }, { status: e.status });
  return authErrorResponse(e);
}

/** Signed-in owner of an approved shop (merchants in review cannot manage a catalogue yet). */
export async function requireMerchant() {
  const user = await requireUser();
  const shop = user.supplier;
  if (!shop) throw new AuthError(403, "Aucune boutique associée à ce compte.");
  if (shop.status !== "approved") {
    throw new AuthError(403, "Votre boutique doit être validée par l'équipe avant de publier des produits.");
  }
  return { user, shop };
}

export const xofToBase = (xof: number) => xof / CURRENCY_RATES.XOF;
export const baseToXof = (base: number) => Math.round(base * CURRENCY_RATES.XOF);

// ------------------------------------------------------------------ input
type TierIn = { minQty?: unknown; price?: unknown };
type AttrIn = { k?: unknown; v?: unknown };
type VariantIn = { name?: unknown; options?: unknown };

export type ProductInput = {
  title: string;
  description: string;
  categoryId: string;
  images: string[];
  unit: string;
  minOrder: number;
  stock: number | null;
  sku: string | null;
  readyToShip: boolean;
  customizable: boolean;
  keyAttributes: { k: string; v: string }[];
  variants: { name: string; options: string[] }[];
  tiers: { minQty: number; maxQty: number | null; priceXof: number }[];
};

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().replace(/[ \t]+/g, " ").slice(0, max) : "");
const int = (v: unknown) => {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? Math.trunc(n) : NaN;
};

/**
 * Validates the product form. Drafts may be incomplete; publishing requires a
 * complete listing (photos, price, description) — `requireComplete`.
 */
export async function parseProductInput(body: Record<string, unknown>, requireComplete: boolean): Promise<ProductInput> {
  const title = text(body.title, 140);
  if (title.length < 5) throw new CatalogError(400, "Le titre doit contenir au moins 5 caractères.");

  const description = typeof body.description === "string" ? body.description.trim().slice(0, 5000) : "";
  if (requireComplete && description.length < 20) {
    throw new CatalogError(400, "Ajoutez une description d'au moins 20 caractères avant de publier.");
  }

  const categoryId = text(body.categoryId, 40);
  if (!categoryId || !(await db.category.findUnique({ where: { id: categoryId }, select: { id: true } }))) {
    throw new CatalogError(400, "Choisissez une catégorie.");
  }

  const images = Array.isArray(body.images)
    ? [...new Set(body.images.filter((u): u is string => typeof u === "string" && /^https:\/\//.test(u)).map((u) => u.slice(0, 600)))]
    : [];
  if (images.length > MAX_PRODUCT_IMAGES) throw new CatalogError(400, `${MAX_PRODUCT_IMAGES} photos maximum.`);
  if (requireComplete && images.length === 0) throw new CatalogError(400, "Ajoutez au moins une photo avant de publier.");

  const unit = (PRODUCT_UNITS as readonly string[]).includes(String(body.unit)) ? String(body.unit) : "pièce";
  const minOrder = int(body.minOrder ?? 1);
  if (!(minOrder >= 1 && minOrder <= 1_000_000)) throw new CatalogError(400, "Quantité minimum invalide (1 au minimum).");

  let stock: number | null = null;
  if (body.stock !== null && body.stock !== undefined && body.stock !== "") {
    stock = int(body.stock);
    if (!(stock >= 0 && stock <= 100_000_000)) throw new CatalogError(400, "Stock invalide.");
  }
  const sku = text(body.sku, 60) || null;

  // Price per quantity, typed in FCFA
  const rawTiers = (Array.isArray(body.tiers) ? body.tiers : []) as TierIn[];
  const tiers = rawTiers
    .map((t) => ({ minQty: int(t.minQty), priceXof: int(t.price) }))
    .filter((t) => Number.isFinite(t.minQty) || Number.isFinite(t.priceXof));
  if (tiers.length > 5) throw new CatalogError(400, "5 paliers de prix maximum.");
  for (const t of tiers) {
    if (!(t.minQty >= 1)) throw new CatalogError(400, "Chaque palier doit avoir une quantité minimum ≥ 1.");
    if (!(t.priceXof >= 1 && t.priceXof <= 1_000_000_000)) throw new CatalogError(400, "Prix invalide (en FCFA, entier positif).");
  }
  tiers.sort((a, b) => a.minQty - b.minQty);
  for (let i = 1; i < tiers.length; i++) {
    if (tiers[i].minQty === tiers[i - 1].minQty) throw new CatalogError(400, "Deux paliers ont la même quantité minimum.");
  }
  if (tiers.length && tiers[0].minQty > minOrder) {
    throw new CatalogError(400, "Le premier palier de prix doit commencer à la quantité minimum de commande.");
  }
  if (requireComplete && tiers.length === 0) throw new CatalogError(400, "Indiquez au moins un prix avant de publier.");

  const keyAttributes = ((Array.isArray(body.keyAttributes) ? body.keyAttributes : []) as AttrIn[])
    .map((a) => ({ k: text(a.k, 40), v: text(a.v, 120) }))
    .filter((a) => a.k && a.v)
    .slice(0, 20);

  const variants = ((Array.isArray(body.variants) ? body.variants : []) as VariantIn[])
    .map((v) => ({
      name: text(v.name, 30),
      options: [...new Set((Array.isArray(v.options) ? v.options : []).map((o) => text(o, 40)).filter(Boolean))].slice(0, 30),
    }))
    .filter((v) => v.name && v.options.length)
    .slice(0, 4);

  return {
    title,
    description,
    categoryId,
    images,
    unit,
    minOrder,
    stock,
    sku,
    readyToShip: body.readyToShip === true,
    customizable: body.customizable === true,
    keyAttributes,
    variants,
    tiers: tiers.map((t, i) => ({ ...t, maxQty: tiers[i + 1] ? tiers[i + 1].minQty - 1 : null })),
  };
}

/** Image URLs a product may reference: its own current images + files of this shop's folder. */
export function assertImagesAllowed(images: string[], shopId: string, existing: string[] = []) {
  const prefix = `${SUPABASE_URL}/storage/v1/object/public/${PRODUCT_BUCKET}/${shopId}/`;
  for (const url of images) {
    if (!existing.includes(url) && !url.startsWith(prefix)) {
      throw new CatalogError(400, "Image non autorisée : téléversez vos photos depuis le formulaire.");
    }
  }
}

/** Fields stored on Product (prices go to PriceTier). */
export function productData(input: ProductInput) {
  return {
    title: input.title,
    description: input.description,
    categoryId: input.categoryId,
    images: JSON.stringify(input.images),
    unit: input.unit,
    minOrder: String(input.minOrder),
    minOrderUnit: input.unit,
    stock: input.stock,
    sku: input.sku,
    readyToShip: input.readyToShip,
    customizable: input.customizable,
    keyAttributes: JSON.stringify(input.keyAttributes),
    variantsJson: JSON.stringify(input.variants),
  };
}

export function tierRows(input: ProductInput) {
  return input.tiers.map((t) => ({ minQty: t.minQty, maxQty: t.maxQty, price: xofToBase(t.priceXof), unit: input.unit }));
}

export async function uniqueProductSlug(title: string) {
  const base = slugify(title).slice(0, 60) || "produit";
  for (let i = 0; i < 5; i++) {
    const slug = i === 0 ? base : `${base}-${crypto.randomUUID().slice(0, 6)}`;
    if (!(await db.product.findUnique({ where: { slug }, select: { id: true } }))) return slug;
  }
  return `${base}-${crypto.randomUUID()}`;
}

/** Product as the merchant edits it (prices back in FCFA). */
export function merchantProductView(p: {
  id: string; title: string; slug: string; description: string; categoryId: string; images: string; unit: string;
  minOrder: string; stock: number | null; sku: string | null; readyToShip: boolean; customizable: boolean;
  keyAttributes: string; variantsJson: string; status: string; moderation: string; moderationReason: string | null;
  sold: number; createdAt: Date; updatedAt: Date; publishedAt: Date | null;
  priceTiers: { minQty: number; maxQty: number | null; price: number }[];
  category?: { name: string } | null;
}) {
  const parse = <T,>(s: string, d: T): T => {
    try {
      return JSON.parse(s) as T;
    } catch {
      return d;
    }
  };
  const tiers = [...p.priceTiers].sort((a, b) => a.minQty - b.minQty).map((t) => ({ minQty: t.minQty, maxQty: t.maxQty, price: baseToXof(t.price) }));
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    description: p.description,
    categoryId: p.categoryId,
    categoryName: p.category?.name ?? null,
    images: parse<string[]>(p.images, []),
    unit: p.unit,
    minOrder: Number.parseInt(p.minOrder, 10) || 1,
    stock: p.stock,
    sku: p.sku,
    readyToShip: p.readyToShip,
    customizable: p.customizable,
    keyAttributes: parse<{ k: string; v: string }[]>(p.keyAttributes, []),
    variants: parse<{ name: string; options: string[] }[]>(p.variantsJson, []),
    tiers,
    priceFrom: tiers.length ? Math.min(...tiers.map((t) => t.price)) : null,
    status: p.status as ProductStatus,
    moderation: p.moderation,
    moderationReason: p.moderationReason,
    sold: p.sold,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    publishedAt: p.publishedAt?.toISOString() ?? null,
  };
}
export type MerchantProduct = ReturnType<typeof merchantProductView>;

// ------------------------------------------------------------------ images
export async function uploadProductImage(shopId: string, file: File) {
  if (file.size === 0) throw new CatalogError(400, "Fichier vide");
  if (file.size > MAX_IMAGE_BYTES) throw new CatalogError(413, "Image trop lourde (4 Mo max).");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffImage(bytes);
  if (!kind) throw new CatalogError(415, "Format non pris en charge (JPEG, PNG ou WebP uniquement).");

  const path = `${shopId}/${crypto.randomUUID()}.${kind.ext}`;
  const supabase = await getSupabaseServer();
  const { error } = await supabase.storage.from(PRODUCT_BUCKET).upload(path, bytes, {
    contentType: kind.mime,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) {
    console.error("[catalog] upload failed", error.message);
    throw new CatalogError(503, "Envoi de l'image impossible pour le moment. Réessayez.");
  }
  const { data } = supabase.storage.from(PRODUCT_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

/** Best-effort removal of this shop's stored files that are no longer referenced. */
export async function removeProductImages(shopId: string, urls: string[]) {
  const prefix = `${SUPABASE_URL}/storage/v1/object/public/${PRODUCT_BUCKET}/`;
  const paths = urls.filter((u) => u.startsWith(`${prefix}${shopId}/`)).map((u) => u.slice(prefix.length));
  if (!paths.length) return;
  try {
    const supabase = await getSupabaseServer();
    await supabase.storage.from(PRODUCT_BUCKET).remove(paths);
  } catch (e) {
    console.error("[catalog] image cleanup failed", e);
  }
}
