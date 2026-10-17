import { NextResponse } from "next/server";
import { audit } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  CatalogError, assertImagesAllowed, catalogErrorResponse, merchantProductView, parseProductInput, productData,
  removeProductImages, requireMerchant, tierRows,
} from "@/lib/catalog";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };
const include = { priceTiers: true, category: { select: { name: true } } } as const;
const parseImages = (s: string) => {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? (v as string[]) : [];
  } catch {
    return [];
  }
};

/** Only the owner shop can see / change a product (404 otherwise: no enumeration). */
async function ownProduct(id: string, shopId: string) {
  const product = await db.product.findFirst({ where: { id, supplierId: shopId }, include });
  if (!product) throw new CatalogError(404, "Produit introuvable");
  return product;
}

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { shop } = await requireMerchant();
    const { id } = await params;
    return NextResponse.json({ product: merchantProductView(await ownProduct(id, shop.id)) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return catalogErrorResponse(e);
  }
}

/**
 * MERCHANT: update a product.
 *   { action: "publish" | "unpublish" | "archive" | "restore" }   status change only
 *   { ...form fields, publish?: boolean }                           full edit
 *     publish true  -> published (listing must be complete)
 *     publish false -> draft
 *     omitted       -> keeps the current status
 */
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { user, shop } = await requireMerchant();
    const { id } = await params;
    const current = await ownProduct(id, shop.id);
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    if (typeof body.action === "string") {
      const action = body.action;
      const now = new Date();
      let data: { status: string; publishedAt?: Date | null };
      if (action === "publish") {
        if (current.status === "archived") throw new CatalogError(409, "Restaurez d'abord ce produit.");
        // Re-validate the stored listing as a complete one.
        await parseProductInput(merchantProductView(current) as unknown as Record<string, unknown>, true);
        data = { status: "published", publishedAt: current.publishedAt ?? now };
      } else if (action === "unpublish") {
        data = { status: "draft" };
      } else if (action === "archive") {
        data = { status: "archived" };
      } else if (action === "restore") {
        if (current.status !== "archived") throw new CatalogError(409, "Ce produit n'est pas archivé.");
        data = { status: "draft" };
      } else {
        throw new CatalogError(400, "Action inconnue");
      }
      const product = await db.product.update({ where: { id }, data, include });
      await audit(user.id, `product.${action}`, "product", id, { title: current.title });
      return NextResponse.json({ product: merchantProductView(product) });
    }

    if (current.status === "archived") throw new CatalogError(409, "Restaurez ce produit avant de le modifier.");
    const nextStatus = body.publish === true ? "published" : body.publish === false ? "draft" : current.status;
    const input = await parseProductInput(body, nextStatus === "published");
    const previousImages = parseImages(current.images);
    assertImagesAllowed(input.images, shop.id, previousImages);

    const product = await db.$transaction(async (tx) => {
      await tx.priceTier.deleteMany({ where: { productId: id } });
      return tx.product.update({
        where: { id },
        data: {
          ...productData(input),
          status: nextStatus,
          publishedAt: nextStatus === "published" ? (current.publishedAt ?? new Date()) : current.publishedAt,
          priceTiers: { create: tierRows(input) },
        },
        include,
      });
    });

    const dropped = previousImages.filter((u) => !input.images.includes(u));
    if (dropped.length) await removeProductImages(shop.id, dropped);
    await audit(user.id, "product.update", "product", id, { title: product.title, status: nextStatus });
    return NextResponse.json({ product: merchantProductView(product) });
  } catch (e) {
    return catalogErrorResponse(e);
  }
}

/**
 * MERCHANT: delete. A product that appears in orders is archived instead (order
 * history must stay intact); otherwise it is removed with its photos.
 */
export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { user, shop } = await requireMerchant();
    const { id } = await params;
    const current = await ownProduct(id, shop.id);

    if ((await db.orderItem.count({ where: { productId: id } })) > 0) {
      await db.product.update({ where: { id }, data: { status: "archived" } });
      await audit(user.id, "product.archive", "product", id, { title: current.title, reason: "has orders" });
      return NextResponse.json({ result: "archived", message: "Ce produit figure dans des commandes : il a été archivé au lieu d'être supprimé." });
    }

    await db.$transaction([
      db.cartItem.deleteMany({ where: { productId: id } }),
      db.product.delete({ where: { id } }), // price tiers, reviews, favorites cascade; chats keep the thread
    ]);
    await removeProductImages(shop.id, parseImages(current.images));
    await audit(user.id, "product.delete", "product", id, { title: current.title });
    return NextResponse.json({ result: "deleted" });
  } catch (e) {
    return catalogErrorResponse(e);
  }
}
