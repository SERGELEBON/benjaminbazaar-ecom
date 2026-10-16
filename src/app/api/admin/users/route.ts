import { NextResponse, type NextRequest } from "next/server";
import { authErrorResponse, isProtectedAdmin, isSuperAdmin, requireRole } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** ADMIN: list real user accounts (internal catalogue accounts excluded). */
export async function GET(req: NextRequest) {
  try {
    const me = await requireRole("ADMIN");
    const sp = req.nextUrl.searchParams;
    const q = sp.get("q")?.trim();
    const role = sp.get("role");
    const where: Record<string, unknown> = { status: { not: "system" } };
    if (role && ["BUYER", "SUPPLIER", "ADMIN"].includes(role)) where.role = role;
    if (q) where.OR = [{ email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }];
    const [rows, total] = await Promise.all([
      db.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true, name: true, email: true, role: true, adminLevel: true, status: true, createdAt: true, lastLoginAt: true,
          supplier: { select: { id: true, name: true, status: true } },
        },
      }),
      db.user.count({ where }),
    ]);
    const users = rows.map((u) => ({
      ...u,
      isSuperAdmin: isSuperAdmin(u),
      protected: isProtectedAdmin(u),
    }));
    return NextResponse.json({ users, total, viewer: { isSuperAdmin: isSuperAdmin(me) } }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return authErrorResponse(e);
  }
}
