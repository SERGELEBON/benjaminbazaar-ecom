import { NextResponse } from "next/server";
import { authErrorResponse, requireRole, type Role } from "@/lib/auth";
import { db } from "@/lib/db";

const ROLES: Role[] = ["BUYER", "SUPPLIER", "ADMIN"];
const STATUSES = ["active", "suspended"];

/** ADMIN: change a user's role or suspend / reactivate the account. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireRole("ADMIN");
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as { role?: Role; status?: string };

    const target = await db.user.findUnique({ where: { id } });
    if (!target || target.status === "system") return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    if (target.id === admin.id) {
      return NextResponse.json({ error: "Vous ne pouvez pas modifier votre propre rôle ou statut." }, { status: 400 });
    }

    const data: { role?: Role; status?: string } = {};
    if (body.role !== undefined) {
      if (!ROLES.includes(body.role)) return NextResponse.json({ error: "Rôle invalide" }, { status: 400 });
      if (body.role === "SUPPLIER" && !(await db.supplier.findUnique({ where: { userId: id } }))) {
        return NextResponse.json({ error: "Ce compte n'a pas de profil marchand." }, { status: 400 });
      }
      data.role = body.role;
    }
    if (body.status !== undefined) {
      if (!STATUSES.includes(body.status)) return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
      data.status = body.status;
    }
    const user = await db.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, status: true },
    });
    return NextResponse.json({ user });
  } catch (e) {
    return authErrorResponse(e);
  }
}
