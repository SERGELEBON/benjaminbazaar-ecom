import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { requireSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** SUPER ADMIN: latest admin actions (who did what, when). */
export async function GET() {
  try {
    await requireSuperAdmin();
    const rows = await db.auditLog.findMany({
      where: { action: { not: "product.image.upload" } }, // technical rate-limit entries
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true, action: true, targetType: true, targetId: true, details: true, createdAt: true,
        actor: { select: { name: true, email: true } },
      },
    });
    const entries = rows.map((r) => {
      let details: Record<string, unknown> | null = null;
      try {
        details = r.details ? JSON.parse(r.details) : null;
      } catch {
        details = null;
      }
      return { ...r, details };
    });
    return NextResponse.json({ entries }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return errorResponse(e);
  }
}
