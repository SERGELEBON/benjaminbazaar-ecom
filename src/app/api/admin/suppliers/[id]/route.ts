import { NextResponse } from "next/server";
import { authErrorResponse, requireRole } from "@/lib/auth";
import { db } from "@/lib/db";

/** ADMIN: approve or reject a merchant. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole("ADMIN");
    const { id } = await params;
    const { status } = (await req.json().catch(() => ({}))) as { status?: string };
    if (!status || !["approved", "rejected", "pending"].includes(status)) {
      return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
    }
    const supplier = await db.supplier.update({
      where: { id },
      data: { status, verified: status === "approved" },
      select: { id: true, name: true, status: true, verified: true },
    });
    return NextResponse.json({ supplier });
  } catch (e) {
    return authErrorResponse(e);
  }
}
