/**
 * Server-side authentication & authorization (never import in client components).
 *
 * - Identity: Supabase Auth (email/password + Google OAuth). Passwords are hashed
 *   and stored by Supabase only.
 * - Profile & role: our `User` table (BUYER | SUPPLIER | ADMIN), linked by `authId`.
 * - Every protected API route calls `requireUser()` / `requireRole()`; the client UI
 *   only reflects what the server allows.
 */
import { NextResponse } from "next/server";
import type { User as AuthUser } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import { getSupabaseServer } from "@/lib/supabase/server";

export type Role = "BUYER" | "SUPPLIER" | "ADMIN";
export const SELF_SIGNUP_ROLES: Role[] = ["BUYER", "SUPPLIER"]; // ADMIN can never be self-assigned

/** Emails promoted to ADMIN on login (comma separated env var). */
function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export class AuthError extends Error {
  constructor(public status: 401 | 403, message: string) {
    super(message);
  }
}

export function authErrorResponse(e: unknown) {
  if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
  console.error("[auth] unexpected error", e);
  return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
}

/** Validated Supabase user (getUser() contacts Supabase: never trust the cookie alone). */
export async function getAuthUser(): Promise<AuthUser | null> {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 50) || "boutique";
}

type SignupMeta = {
  name?: string;
  full_name?: string;
  avatar_url?: string;
  picture?: string;
  intent?: string;
  company?: string;
  phone?: string;
  city?: string;
  country?: string;
};

/**
 * Returns the profile linked to the Supabase user, creating it on first login.
 * `intent` (BUYER | SUPPLIER) is only used when the profile does not exist yet.
 */
export async function ensureProfile(authUser: AuthUser, intent?: string | null) {
  const email = (authUser.email ?? "").toLowerCase();
  if (!email) throw new AuthError(401, "Compte sans email");
  const meta = (authUser.user_metadata ?? {}) as SignupMeta;
  const emailConfirmed = Boolean(authUser.email_confirmed_at);
  const isAdminEmail = emailConfirmed && adminEmails().includes(email);

  let user = await db.user.findUnique({ where: { authId: authUser.id }, include: { supplier: true } });

  if (!user) {
    // Link a pre-existing real (non-system) profile with the same email, if any.
    const existing = await db.user.findUnique({ where: { email }, include: { supplier: true } });
    if (existing) {
      if (existing.status === "system" || existing.authId) {
        throw new AuthError(403, "Cet email ne peut pas être utilisé.");
      }
      user = await db.user.update({ where: { id: existing.id }, data: { authId: authUser.id }, include: { supplier: true } });
    }
  }

  if (!user) {
    const requested = (intent ?? meta.intent ?? "BUYER").toUpperCase() as Role;
    const role: Role = isAdminEmail ? "ADMIN" : SELF_SIGNUP_ROLES.includes(requested) ? requested : "BUYER";
    const name = (meta.name ?? meta.full_name ?? email.split("@")[0]).slice(0, 80);

    user = await db.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          authId: authUser.id,
          email,
          name,
          phone: meta.phone?.slice(0, 30) ?? null,
          avatarUrl: meta.avatar_url ?? meta.picture ?? null,
          role,
          country: meta.country?.slice(0, 60) || "Côte d'Ivoire",
        },
      });
      if (role === "SUPPLIER") {
        const company = (meta.company ?? `Boutique de ${name}`).slice(0, 80);
        let slug = slugify(company);
        if (await tx.supplier.findUnique({ where: { slug } })) slug = `${slug}-${created.id.slice(-6)}`;
        await tx.supplier.create({
          data: {
            userId: created.id,
            name: company,
            slug,
            city: meta.city?.slice(0, 60) || "Abidjan",
            country: meta.country?.slice(0, 60) || "Côte d'Ivoire",
            phone: meta.phone?.slice(0, 30) ?? null,
            years: 0,
            verified: false,
            status: "pending", // must be approved by an admin before selling
            storeRating: 0,
            reorderRate: 0,
            onTimeDispatch: 0,
          },
        });
      }
      return tx.user.findUniqueOrThrow({ where: { id: created.id }, include: { supplier: true } });
    });
  } else if (isAdminEmail && user.role !== "ADMIN") {
    user = await db.user.update({ where: { id: user.id }, data: { role: "ADMIN" }, include: { supplier: true } });
  }

  if (user.status === "suspended") throw new AuthError(403, "Compte suspendu. Contactez le support.");
  return user;
}

/** Current profile or null (no exception). */
export async function getCurrentUser() {
  const authUser = await getAuthUser();
  if (!authUser) return null;
  const user = await db.user.findUnique({ where: { authId: authUser.id }, include: { supplier: true } });
  if (!user || user.status !== "active") return null;
  return user;
}

export async function requireUser() {
  const authUser = await getAuthUser();
  if (!authUser) throw new AuthError(401, "Connexion requise");
  return ensureProfile(authUser);
}

export async function requireRole(...roles: Role[]) {
  const user = await requireUser();
  if (!roles.includes(user.role as Role)) throw new AuthError(403, "Accès refusé");
  return user;
}

/** Public shape returned to the browser (no internal fields). */
export function publicProfile(user: Awaited<ReturnType<typeof requireUser>>) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    role: user.role as Role,
    status: user.status,
    supplier: user.supplier
      ? { id: user.supplier.id, name: user.supplier.name, slug: user.supplier.slug, status: user.supplier.status }
      : null,
  };
}
export type PublicProfile = ReturnType<typeof publicProfile>;
