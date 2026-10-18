import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { audit, requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { afterResponse } from "@/lib/email";
import { notifyMerchantDecision } from "@/lib/notifications";

type Decision = "approved" | "rejected" | "suspended" | "pending";
const DECISIONS: Decision[] = ["approved", "rejected", "suspended", "pending"];

/**
 * ADMIN: review a merchant.
 *   approved   -> shop public + "verified"; the owner gets the SUPPLIER role if needed
 *   rejected   -> reason required (shown to the merchant, who can fix and resubmit)
 *   suspended  -> reason required; shop and products hidden
 *   pending    -> back to the review queue
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireRole("ADMIN");
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as { status?: string; reason?: string };
    const status = body.status as Decision;
    if (!DECISIONS.includes(status)) return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : "";
    if ((status === "rejected" || status === "suspended") && reason.length < 5) {
      return NextResponse.json({ error: "Indiquez le motif (5 caractères minimum) : il sera affiché au marchand." }, { status: 400 });
    }

    const current = await db.supplier.findUnique({ where: { id }, include: { user: true } });
    if (!current || current.user.status === "system") {
      return NextResponse.json({ error: "Marchand introuvable" }, { status: 404 });
    }
    if (current.status === status) {
      return NextResponse.json({ error: "Le marchand a déjà ce statut. Actualisez la liste." }, { status: 409 });
    }

    const supplier = await db.$transaction(async (tx) => {
      const updated = await tx.supplier.update({
        where: { id },
        data: {
          status,
          verified: status === "approved",
          statusReason: status === "rejected" || status === "suspended" ? reason : null,
          reviewedAt: new Date(),
          reviewedById: admin.id,
        },
        select: { id: true, name: true, status: true, verified: true, statusReason: true, reviewedAt: true },
      });
      // Coherence: an approved shop always belongs to a SUPPLIER (admins keep their role).
      if (status === "approved" && current.user.role === "BUYER") {
        await tx.user.update({ where: { id: current.userId }, data: { role: "SUPPLIER" } });
      }
      return updated;
    });

    await audit(admin.id, `supplier.${status}`, "supplier", id, {
      from: current.status,
      to: status,
      reason: reason || undefined,
      shop: current.name,
    });
    afterResponse(() => notifyMerchantDecision(id, status));
    return NextResponse.json({ supplier });
  } catch (e) {
    return errorResponse(e);
  }
}
