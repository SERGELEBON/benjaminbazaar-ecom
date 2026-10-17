import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { CatalogError, catalogErrorResponse, requireMerchant, uploadProductImage } from "@/lib/catalog";

export const dynamic = "force-dynamic";

const UPLOADS_PER_HOUR = 120;

/**
 * MERCHANT: upload one product photo (multipart "file", JPEG/PNG/WebP <= 4 MB).
 * Stored in the public "product-images" bucket under the shop's own folder; the
 * returned URL is then referenced by the product form.
 */
export async function POST(req: Request) {
  try {
    const { user, shop } = await requireMerchant();

    const recent = await db.auditLog.count({
      where: { actorId: user.id, action: "product.image.upload", createdAt: { gt: new Date(Date.now() - 3_600_000) } },
    });
    if (recent >= UPLOADS_PER_HOUR) throw new CatalogError(429, "Trop d'envois d'images. Réessayez dans une heure.");

    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!file || typeof file === "string") throw new CatalogError(400, "Aucune image reçue.");

    const { url, path } = await uploadProductImage(shop.id, file);
    await db.auditLog.create({ data: { actorId: user.id, action: "product.image.upload", targetType: "supplier", targetId: shop.id, details: JSON.stringify({ path }) } });
    return NextResponse.json({ url }, { status: 201 });
  } catch (e) {
    return catalogErrorResponse(e);
  }
}
