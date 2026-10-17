import { ValidationError } from "@/lib/errors";
import { cleanText, isPhone } from "@/lib/sanitize";

/**
 * Merchant (supplier) lifecycle shared by the API routes.
 *
 *   signup / "Devenir vendeur"  ->  pending
 *   pending   --admin-->  approved | rejected (reason)
 *   rejected  --merchant edits & resubmits-->  pending
 *   approved  --admin-->  suspended (reason)  --admin-->  approved
 *
 * Only "approved" shops (whose owner is not suspended) are public. The owner keeps
 * the SUPPLIER role in every state, so the merchant space always shows where the
 * application stands.
 */
export const SUPPLIER_STATUSES = ["pending", "approved", "rejected", "suspended"] as const;
export type SupplierStatus = (typeof SUPPLIER_STATUSES)[number];

export { ValidationError };

export type ShopInput = {
  name: string;
  phone: string;
  city: string;
  country: string;
  mainCategory: string | null;
  description: string | null;
};

const str = cleanText;

/** Validates the merchant shop form (sign-up completion, "Devenir vendeur", edits). */
export function parseShopInput(body: Record<string, unknown>): ShopInput {
  const name = str(body.name ?? body.company, 80);
  const phone = str(body.phone, 30);
  const city = str(body.city, 60);
  const country = str(body.country, 60) || "Côte d'Ivoire";
  const mainCategory = str(body.mainCategory, 80) || null;
  const description =
    typeof body.description === "string" ? body.description.trim().slice(0, 1000) || null : null;
  if (name.length < 2) throw new ValidationError("Entrez le nom de votre entreprise.");
  if (!isPhone(phone)) throw new ValidationError("Entrez un numéro de téléphone valide.");
  if (city.length < 2) throw new ValidationError("Entrez votre ville.");
  return { name, phone, city, country, mainCategory, description };
}

export function slugify(s: string) {
  return (
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 50) || "boutique"
  );
}

/** Prisma filter for shops visible to the public. */
export const PUBLIC_SUPPLIER_WHERE = { status: "approved", user: { status: { not: "suspended" } } } as const;

/** Prisma filter for products visible to the public (published, not blocked, public shop). */
export const PUBLIC_PRODUCT_WHERE = {
  status: "published",
  moderation: "ok",
  supplier: PUBLIC_SUPPLIER_WHERE,
} as const;
