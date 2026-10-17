import { NextResponse } from "next/server";
import { audit, authErrorResponse, requireRole } from "@/lib/auth";
import { db } from "@/lib/db";

/** ADMIN: block (reason required, shown to the merchant) or unblock a product. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireRole("ADMIN");
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as { moderation?: string; reason?: string };
    if (body.moderation !== "blocked" && body.moderation !== "ok") {
      return NextResponse.json({ error: "Action invalide" }, { status: 400 });
    }
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : "";
    if (body.moderation === "blocked" && reason.length < 5) {
      return NextResponse.json({ error: "Indiquez le motif (5 caractères minimum) : il sera affiché au marchand." }, { status: 400 });
    }
    const current = await db.product.findUnique({ where: { id }, select: { id: true, title: true, moderation: true } });
    if (!current) return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
    if (current.moderation === body.moderation) {
      return NextResponse.json({ error: "Le produit a déjà ce statut. Actualisez la liste." }, { status: 409 });
    }
    const product = await db.product.update({
      where: { id },
      data: { moderation: body.moderation, moderationReason: body.moderation === "blocked" ? reason : null },
      select: { id: true, moderation: true, moderationReason: true },
    });
    await audit(admin.id, body.moderation === "blocked" ? "product.block" : "product.unblock", "product", id, {
      title: current.title,
      reason: reason || undefined,
    });
    return NextResponse.json({ product });
  } catch (e) {
    return authErrorResponse(e);
  }
}
