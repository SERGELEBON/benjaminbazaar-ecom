import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { AuthError, ensureProfile } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * OAuth (Google) and email-link (confirmation / password reset) landing route.
 * Exchanges the one-time PKCE code for a session cookie, provisions the profile,
 * then sends the user back to the app. Only whitelisted `next` values are accepted
 * (no open redirect).
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") === "reset" ? "reset" : "signed-in";
  const intent = url.searchParams.get("intent");
  const back = (status: string) => NextResponse.redirect(new URL(`/?auth=${status}`, url.origin));

  if (!code) return back("error");

  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return back("error");

  try {
    const user = await ensureProfile(data.user, intent);
    await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  } catch (e) {
    await supabase.auth.signOut();
    return back(e instanceof AuthError && e.status === 403 ? "suspended" : "error");
  }
  return back(next);
}
