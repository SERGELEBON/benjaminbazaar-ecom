import { NextResponse, type NextRequest } from "next/server";
import { audit } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  CatalogError, MAX_PRODUCTS_PER_SHOP, PRODUCT_STATUSES, assertImagesAllowed, catalogErrorResponse,
  merchantProductView, parseProductInput, productData, requireMerchant, tierRows, uniqueProductSlug,
} from "@/lib/catalog";

export const dynamic = "force-dynamic";

const include = { priceTiers: true, category: { select: { name: true } } } as const;

/** MERCHANT: own products (every status) + a counter per status. */
export async function GET(req: NextRequest) {
  try {
    const { shop } = await requireMerchant();
    const sp = req.nextUrl.searchParams;
    const status = sp.get("status");
    const q = sp.get("q")?.trim();
    const where: Record<string, unknown> = { supplierId: shop.id };
    if (status && (PRODUCT_STATUSES as readonly string[]).includes(status)) where.status = status;
    if (status === "blocked") where.moderation = "blocked";
    if (q) where.OR = [{ title: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }];

    const [rows, grouped, blocked] = await Promise.all([
      db.product.findMany({ where, include, orderBy: { updatedAt: "desc" }, take: 200 }),
      db.product.groupBy({ by: ["status"], where: { supplierId: shop.id }, _count: { _all: true } }),
      db.product.count({ where: { supplierId: shop.id, moderation: "blocked" } }),
    ]);
    const counts: Record<string, number> = { draft: 0, published: 0, archived: 0, blocked };
    for (const g of grouped) counts[g.status] = g._count._all;
    return NextResponse.json({ products: rows.map(merchantProductView), counts }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return catalogErrorResponse(e);
  }
}

/** MERCHANT: create a product, as a draft or directly published ({ ..., publish: true }). */
export async function POST(req: Request) {
  try {
    const { user, shop } = await requireMerchant();
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const publish = body.publish === true;
    const input = await parseProductInput(body, publish);
    assertImagesAllowed(input.images, shop.id);

    if ((await db.product.count({ where: { supplierId: shop.id } })) >= MAX_PRODUCTS_PER_SHOP) {
      throw new CatalogError(409, `Limite de ${MAX_PRODUCTS_PER_SHOP} produits atteinte.`);
    }

    const product = await db.product.create({
      data: {
        ...productData(input),
        slug: await uniqueProductSlug(input.title),
        supplierId: shop.id,
        status: publish ? "published" : "draft",
        publishedAt: publish ? new Date() : null,
        // New listings start without marketing badges or fake stats.
        rating: 0,
        reviewCount: 0,
        reorderRate: 0,
        popularity: 0,
        tradeAssurance: false,
        priceTiers: { create: tierRows(input) },
      },
      include,
    });
    await audit(user.id, publish ? "product.publish" : "product.create", "product", product.id, { title: product.title });
    return NextResponse.json({ product: merchantProductView(product) }, { status: 201 });
  } catch (e) {
    return catalogErrorResponse(e);
  }
}
