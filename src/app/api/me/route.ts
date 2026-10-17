import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { getAuthUser, ensureProfile, publicProfile } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Current signed-in profile (creates it on first call after an email/password sign-up). */
export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ user: null }, { headers: { "Cache-Control": "no-store" } });
    const user = await ensureProfile(authUser);
    return NextResponse.json({ user: publicProfile(user) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return errorResponse(e);
  }
}

/** Update own basic profile fields (never role/status). */
export async function PATCH(req: Request) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
    const me = await ensureProfile(authUser);
    const body = (await req.json().catch(() => ({}))) as { name?: string; phone?: string };
    const data: { name?: string; phone?: string | null } = {};
    if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim().slice(0, 80);
    if (typeof body.phone === "string") data.phone = body.phone.trim().slice(0, 30) || null;
    const user = await db.user.update({ where: { id: me.id }, data, include: { supplier: true } });
    return NextResponse.json({ user: publicProfile(user) });
  } catch (e) {
    return errorResponse(e);
  }
}
