import { NextResponse, type NextRequest } from "next/server";
import { errorResponse } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PUBLIC_PRODUCT_WHERE } from "@/lib/merchant";
import { serializeProduct } from "@/lib/serialize";

export const dynamic = "force-dynamic";
const MAX_FAVORITES = 500;

/** CLIENT: saved products (only those still available publicly are returned as products). */
export async function GET() {
  try {
    const user = await requireUser();
    const rows = await db.favorite.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: MAX_FAVORITES,
      select: { productId: true },
    });
    const ids = rows.map((r) => r.productId);
    const products = ids.length
      ? await db.product.findMany({
          where: { id: { in: ids }, ...PUBLIC_PRODUCT_WHERE },
          include: { supplier: true, category: true, priceTiers: true },
        })
      : [];
    const order = new Map(ids.map((id, i) => [id, i]));
    products.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    return NextResponse.json({ ids, products: products.map(serializeProduct) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return errorResponse(e);
  }
}

/** CLIENT: save a product { productId }. Idempotent. */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const { productId } = (await req.json().catch(() => ({}))) as { productId?: unknown };
    if (typeof productId !== "string" || !productId) return NextResponse.json({ error: "Produit manquant" }, { status: 400 });
    const product = await db.product.findFirst({ where: { id: productId, ...PUBLIC_PRODUCT_WHERE }, select: { id: true } });
    if (!product) return NextResponse.json({ error: "Produit indisponible" }, { status: 404 });
    if ((await db.favorite.count({ where: { userId: user.id } })) >= MAX_FAVORITES) {
      return NextResponse.json({ error: `${MAX_FAVORITES} favoris maximum.` }, { status: 409 });
    }
    await db.favorite.upsert({
      where: { userId_productId: { userId: user.id, productId } },
      create: { userId: user.id, productId },
      update: {},
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}

/** CLIENT: remove a saved product (?productId=). Idempotent. */
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser();
    const productId = req.nextUrl.searchParams.get("productId");
    if (!productId) return NextResponse.json({ error: "Produit manquant" }, { status: 400 });
    await db.favorite.deleteMany({ where: { userId: user.id, productId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
