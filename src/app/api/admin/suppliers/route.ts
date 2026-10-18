import { NextResponse, type NextRequest } from "next/server";
import { errorResponse } from "@/lib/http";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { SUPPLIER_STATUSES } from "@/lib/merchant";

export const dynamic = "force-dynamic";

/** ADMIN: merchant applications / shops by status (default: pending) + a counter per status. */
export async function GET(req: NextRequest) {
  try {
    await requireRole("ADMIN");
    const sp = req.nextUrl.searchParams;
    const status = sp.get("status") ?? "pending";
    const q = sp.get("q")?.trim();
    // Internal catalogue shops (owner status "system") are not merchant applications.
    const base = { user: { status: { not: "system" } } };
    const where: Record<string, unknown> = { ...base };
    if ((SUPPLIER_STATUSES as readonly string[]).includes(status)) where.status = status;
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { user: { email: { contains: q, mode: "insensitive" } } },
      ];
    }
    const [suppliers, grouped] = await Promise.all([
      db.supplier.findMany({
        where,
        orderBy: { createdAt: status === "pending" ? "asc" : "desc" }, // oldest request first
        take: 100,
        select: {
          id: true, name: true, slug: true, city: true, country: true, phone: true, mainCategory: true, description: true,
          status: true, statusReason: true, verified: true, createdAt: true, reviewedAt: true,
          reviewedBy: { select: { name: true, email: true } },
          user: { select: { id: true, name: true, email: true, role: true, status: true, lastLoginAt: true } },
          _count: { select: { products: true } },
        },
      }),
      db.supplier.groupBy({ by: ["status"], where: base, _count: { _all: true } }),
    ]);
    const counts: Record<string, number> = Object.fromEntries(SUPPLIER_STATUSES.map((s) => [s, 0]));
    for (const g of grouped) counts[g.status] = g._count._all;
    return NextResponse.json({ suppliers, counts }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return errorResponse(e);
  }
}
