import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { audit, isProtectedAdmin, isSuperAdmin, requireRole, requireSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** ADMIN: the admin team (+ pending invitations, visible to super admins only). */
export async function GET() {
  try {
    const me = await requireRole("ADMIN");
    const superViewer = isSuperAdmin(me);
    const [admins, invites] = await Promise.all([
      db.user.findMany({
        where: { role: "ADMIN", status: { not: "system" } },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, email: true, role: true, adminLevel: true, status: true, lastLoginAt: true, createdAt: true },
      }),
      superViewer
        ? db.adminInvite.findMany({
            where: { acceptedAt: null },
            orderBy: { createdAt: "desc" },
            select: { id: true, email: true, level: true, createdAt: true, invitedBy: { select: { name: true, email: true } } },
          })
        : [],
    ]);
    return NextResponse.json(
      {
        admins: admins.map((a) => ({ ...a, isSuperAdmin: isSuperAdmin(a), protected: isProtectedAdmin(a) })),
        invites,
        viewer: { id: me.id, isSuperAdmin: superViewer },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}

/**
 * SUPER ADMIN: grant admin access by email { email, level: "super" | "standard" }.
 *  - existing account  -> promoted immediately
 *  - unknown email     -> invitation applied when this person signs in with a verified email
 */
export async function POST(req: Request) {
  try {
    const actor = await requireSuperAdmin();
    const body = (await req.json().catch(() => ({}))) as { email?: string; level?: string };
    const email = (body.email ?? "").trim().toLowerCase();
    const level = body.level === "super" ? "super" : "standard";
    if (!EMAIL_RE.test(email) || email.length > 200) return NextResponse.json({ error: "Adresse email invalide" }, { status: 400 });

    const existing = await db.user.findUnique({ where: { email } });
    if (existing?.status === "system") return NextResponse.json({ error: "Cet email ne peut pas être utilisé." }, { status: 400 });
    if (existing) {
      if (existing.id === actor.id) return NextResponse.json({ error: "Vous êtes déjà administrateur." }, { status: 400 });
      if (existing.role === "ADMIN" && (existing.adminLevel === level || isProtectedAdmin(existing))) {
        return NextResponse.json({ error: "Ce compte est déjà administrateur avec ce niveau." }, { status: 409 });
      }
      const user = await db.user.update({
        where: { id: existing.id },
        data: { role: "ADMIN", adminLevel: level },
        select: { id: true, email: true, role: true, adminLevel: true },
      });
      await db.adminInvite.deleteMany({ where: { email } });
      await audit(actor.id, "admin.grant", "user", user.id, { email, level, from: existing.role });
      return NextResponse.json({ result: "promoted", user });
    }

    const invite = await db.adminInvite.upsert({
      where: { email },
      create: { email, level, invitedById: actor.id },
      update: { level, invitedById: actor.id, acceptedAt: null },
      select: { id: true, email: true, level: true, createdAt: true },
    });
    await audit(actor.id, "admin.invite", "invite", invite.id, { email, level });
    return NextResponse.json({ result: "invited", invite }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
