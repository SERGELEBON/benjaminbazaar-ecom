import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { adminEmails, audit, isProtectedAdmin, isSuperAdmin, requireRole, type Role } from "@/lib/auth";
import { db } from "@/lib/db";

const ROLES: Role[] = ["BUYER", "SUPPLIER", "ADMIN"];
const STATUSES = ["active", "suspended"];
const LEVELS = ["super", "standard"];

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

/**
 * ADMIN: change a user's role / admin level, or suspend / reactivate the account.
 *
 * Permissions
 *   - standard admin: BUYER <-> SUPPLIER, suspend / reactivate non-admin accounts
 *   - super admin:    everything above + grant / remove ADMIN, choose the admin level,
 *                     suspend other admins
 *   - nobody can change their own account, accounts listed in ADMIN_EMAILS (protected),
 *     or remove the last super admin.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRole("ADMIN");
    const actorIsSuper = isSuperAdmin(actor);
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as { role?: Role; status?: string; adminLevel?: string };

    const target = await db.user.findUnique({ where: { id }, include: { supplier: true } });
    if (!target || target.status === "system") return fail(404, "Utilisateur introuvable");
    if (target.id === actor.id) return fail(400, "Vous ne pouvez pas modifier votre propre compte.");
    if (isProtectedAdmin(target)) return fail(403, "Compte super administrateur protégé (défini dans la configuration).");

    const targetIsAdmin = target.role === "ADMIN";
    if (targetIsAdmin && !actorIsSuper) return fail(403, "Seul un super administrateur peut modifier un administrateur.");

    const data: { role?: Role; status?: string; adminLevel?: string | null } = {};

    if (body.role !== undefined && body.role !== target.role) {
      if (!ROLES.includes(body.role)) return fail(400, "Rôle invalide");
      if (body.role === "ADMIN" && !actorIsSuper) return fail(403, "Seul un super administrateur peut nommer un administrateur.");
      if (body.role === "SUPPLIER" && !target.supplier) {
        return fail(400, "Ce compte n'a pas de boutique : il doit d'abord faire une demande « Devenir vendeur ».");
      }
      data.role = body.role;
      data.adminLevel = body.role === "ADMIN" ? (LEVELS.includes(body.adminLevel ?? "") ? body.adminLevel! : "standard") : null;
    } else if (body.adminLevel !== undefined) {
      if (!actorIsSuper) return fail(403, "Seul un super administrateur peut changer le niveau d'un administrateur.");
      if (!targetIsAdmin) return fail(400, "Ce compte n'est pas administrateur.");
      if (!LEVELS.includes(body.adminLevel)) return fail(400, "Niveau invalide");
      data.adminLevel = body.adminLevel;
    }

    if (body.status !== undefined && body.status !== target.status) {
      if (!STATUSES.includes(body.status)) return fail(400, "Statut invalide");
      data.status = body.status;
    }
    if (Object.keys(data).length === 0) return fail(400, "Aucune modification");

    // Never leave the platform without a super admin.
    const losesSuper =
      isSuperAdmin(target) &&
      ((data.role !== undefined && data.role !== "ADMIN") || data.adminLevel === "standard" || data.status === "suspended");
    if (losesSuper) {
      const others = await db.user.count({
        where: { id: { not: target.id }, role: "ADMIN", status: "active", adminLevel: "super" },
      });
      if (others === 0 && adminEmails().length === 0) return fail(400, "Impossible : ce compte est le dernier super administrateur.");
    }

    const user = await db.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data,
        select: { id: true, name: true, email: true, role: true, adminLevel: true, status: true },
      });
      // Coherence: a former merchant demoted to client loses their public shop.
      if (data.role === "BUYER" && target.supplier?.status === "approved") {
        await tx.supplier.update({
          where: { id: target.supplier.id },
          data: { status: "suspended", verified: false, statusReason: "Rôle marchand retiré par un administrateur.", reviewedAt: new Date(), reviewedById: actor.id },
        });
      }
      return updated;
    });

    if (data.role !== undefined) await audit(actor.id, "user.role", "user", id, { from: target.role, to: data.role, level: data.adminLevel ?? undefined });
    else if (data.adminLevel !== undefined) await audit(actor.id, "user.adminLevel", "user", id, { from: target.adminLevel, to: data.adminLevel });
    if (data.status !== undefined) await audit(actor.id, data.status === "suspended" ? "user.suspend" : "user.reactivate", "user", id);

    return NextResponse.json({ user: { ...user, isSuperAdmin: isSuperAdmin(user), protected: false } });
  } catch (e) {
    return errorResponse(e);
  }
}
