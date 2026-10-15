import { NextResponse, type NextRequest } from "next/server";
import { authErrorResponse, requireRole } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** ADMIN: merchant applications (default: pending). */
export async function GET(req: NextRequest) {
  try {
    await requireRole("ADMIN");
    const status = req.nextUrl.searchParams.get("status") ?? "pending";
    const where = ["pending", "approved", "rejected"].includes(status) ? { status } : {};
    const suppliers = await db.supplier.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true, name: true, city: true, country: true, phone: true, status: true, verified: true, createdAt: true,
        user: { select: { name: true, email: true } },
        _count: { select: { products: true } },
      },
    });
    return NextResponse.json({ suppliers });
  } catch (e) {
    return authErrorResponse(e);
  }
}
