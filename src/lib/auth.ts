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
import { slugify } from "@/lib/merchant";

export type Role = "BUYER" | "SUPPLIER" | "ADMIN";
export const SELF_SIGNUP_ROLES: Role[] = ["BUYER", "SUPPLIER"]; // ADMIN can never be self-assigned

/** Emails that are always SUPER admins (comma separated env var, bootstrap / break-glass). */
export function adminEmails(): string[] {
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
  // Admin access granted by a super admin (only honoured for a verified email).
  const invite = emailConfirmed
    ? await db.adminInvite.findUnique({ where: { email } })
    : null;
  const grantedLevel: "super" | "standard" | null = isAdminEmail
    ? "super"
    : invite && !invite.acceptedAt
      ? (invite.level === "super" ? "super" : "standard")
      : null;

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
    const role: Role = grantedLevel ? "ADMIN" : SELF_SIGNUP_ROLES.includes(requested) ? requested : "BUYER";
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
          adminLevel: grantedLevel,
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
  } else if (grantedLevel && (user.role !== "ADMIN" || (grantedLevel === "super" && user.adminLevel !== "super"))) {
    user = await db.user.update({
      where: { id: user.id },
      data: { role: "ADMIN", adminLevel: grantedLevel },
      include: { supplier: true },
    });
  }
  if (invite && !invite.acceptedAt && grantedLevel && !isAdminEmail) {
    await db.adminInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });
    await audit(user.id, "admin.invite.accepted", "user", user.id, { level: grantedLevel });
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

type ProfileLike = { role: string; email: string; adminLevel: string | null };

/** Super admins manage other admins and every role. ADMIN_EMAILS are always super admins. */
export function isSuperAdmin(user: ProfileLike) {
  return user.role === "ADMIN" && (user.adminLevel === "super" || adminEmails().includes(user.email.toLowerCase()));
}

/** Admin accounts defined by ADMIN_EMAILS cannot be demoted or suspended from the UI. */
export function isProtectedAdmin(user: { email: string }) {
  return adminEmails().includes(user.email.toLowerCase());
}

export async function requireSuperAdmin() {
  const user = await requireRole("ADMIN");
  if (!isSuperAdmin(user)) throw new AuthError(403, "Réservé aux super administrateurs");
  return user;
}

/** Append-only audit trail for sensitive admin actions (never throws). */
export async function audit(
  actorId: string | null,
  action: string,
  targetType: "user" | "supplier" | "invite",
  targetId: string,
  details?: Record<string, unknown>,
) {
  try {
    await db.auditLog.create({
      data: { actorId, action, targetType, targetId, details: details ? JSON.stringify(details) : null },
    });
  } catch (e) {
    console.error("[audit] failed", e);
  }
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
    isSuperAdmin: isSuperAdmin(user),
    status: user.status,
    supplier: user.supplier
      ? {
          id: user.supplier.id,
          name: user.supplier.name,
          slug: user.supplier.slug,
          status: user.supplier.status,
          statusReason: user.supplier.statusReason,
          phone: user.supplier.phone,
          city: user.supplier.city,
          country: user.supplier.country,
          mainCategory: user.supplier.mainCategory,
          description: user.supplier.description,
          createdAt: user.supplier.createdAt.toISOString(),
          reviewedAt: user.supplier.reviewedAt?.toISOString() ?? null,
        }
      : null,
  };
}
export type PublicProfile = ReturnType<typeof publicProfile>;
