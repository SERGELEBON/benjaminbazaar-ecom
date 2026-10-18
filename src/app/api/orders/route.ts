import { NextResponse, type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiError, errorResponse, noStore } from "@/lib/http";
import { ORDER_INCLUDE, orderView } from "@/lib/orders";

export const dynamic = "force-dynamic";
const PAGE = 20;
const STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"];

/**
 * Orders list.
 *   ?scope=buyer (default)  my purchases
 *   ?scope=supplier         orders received by my (approved) shop
 *   ?scope=admin            every order (admins)
 *   &status=… &q=ref &cursor=<id>
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const sp = req.nextUrl.searchParams;
    const scope = sp.get("scope") ?? "buyer";
    const where: Prisma.OrderWhereInput = {};
    let role: "buyer" | "supplier" | "admin" = "buyer";
    if (scope === "supplier") {
      if (!user.supplier || user.supplier.status !== "approved") throw new ApiError(403, "Boutique non validée");
      where.supplierId = user.supplier.id;
      role = "supplier";
    } else if (scope === "admin") {
      if (user.role !== "ADMIN") throw new ApiError(403, "Accès refusé");
      role = "admin";
    } else {
      where.userId = user.id;
    }
    const status = sp.get("status");
    if (status && STATUSES.includes(status)) where.status = status;
    const q = sp.get("q")?.trim();
    if (q) where.ref = { contains: q.toUpperCase().slice(0, 30) };

    const cursor = sp.get("cursor");
    const rows = await db.order.findMany({
      where,
      include: ORDER_INCLUDE,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: PAGE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const counts = await db.order.groupBy({ by: ["status"], where: { ...where, status: undefined }, _count: { _all: true } });
    return NextResponse.json(
      {
        orders: rows.slice(0, PAGE).map((o) => orderView(o, role)),
        nextCursor: rows.length > PAGE ? rows[PAGE - 1].id : null,
        counts: Object.fromEntries(counts.map((c) => [c.status, c._count._all])),
      },
      noStore,
    );
  } catch (e) {
    return errorResponse(e);
  }
}
