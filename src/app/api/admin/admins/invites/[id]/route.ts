import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { audit, requireSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

/** SUPER ADMIN: revoke a pending admin invitation. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireSuperAdmin();
    const { id } = await params;
    const invite = await db.adminInvite.findUnique({ where: { id } });
    if (!invite || invite.acceptedAt) return NextResponse.json({ error: "Invitation introuvable" }, { status: 404 });
    await db.adminInvite.delete({ where: { id } });
    await audit(actor.id, "admin.invite.revoke", "invite", id, { email: invite.email });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
