import { NextResponse, type NextRequest } from "next/server";
import { authErrorResponse, requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { baseToXof } from "@/lib/catalog";

export const dynamic = "force-dynamic";

/** ADMIN: merchant products for moderation (catalogue products excluded unless ?all=1). */
export async function GET(req: NextRequest) {
  try {
    await requireRole("ADMIN");
    const sp = req.nextUrl.searchParams;
    const q = sp.get("q")?.trim();
    const filter = sp.get("filter") ?? "published"; // published | blocked | draft | all
    const where: Record<string, unknown> = {};
    if (sp.get("all") !== "1") where.supplier = { user: { status: { not: "system" } } };
    if (filter === "blocked") where.moderation = "blocked";
    else if (filter === "published" || filter === "draft" || filter === "archived") where.status = filter;
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { supplier: { name: { contains: q, mode: "insensitive" } } },
      ];
    }
    const base = sp.get("all") === "1" ? {} : { supplier: { user: { status: { not: "system" } } } };
    const [rows, published, blocked, draft] = await Promise.all([
      db.product.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take: 100,
        select: {
          id: true, title: true, images: true, status: true, moderation: true, moderationReason: true, stock: true,
          updatedAt: true, createdAt: true,
          priceTiers: { select: { price: true }, orderBy: { minQty: "asc" }, take: 1 },
          supplier: { select: { id: true, name: true, status: true } },
          category: { select: { name: true } },
        },
      }),
      db.product.count({ where: { ...base, status: "published" } }),
      db.product.count({ where: { ...base, moderation: "blocked" } }),
      db.product.count({ where: { ...base, status: "draft" } }),
    ]);
    const products = rows.map(({ images, priceTiers, ...p }) => {
      let cover: string | null = null;
      try {
        cover = (JSON.parse(images) as string[])[0] ?? null;
      } catch {
        cover = null;
      }
      return { ...p, cover, priceFrom: priceTiers[0] ? baseToXof(priceTiers[0].price) : null };
    });
    return NextResponse.json({ products, counts: { published, blocked, draft } }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return authErrorResponse(e);
  }
}
