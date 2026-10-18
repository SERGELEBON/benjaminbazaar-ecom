/**
 * Shared server-side HTTP helpers (route handlers only).
 * One error type and one error -> response mapping for every API route.
 */
import { NextResponse } from "next/server";
import { AuthError } from "@/lib/auth";
import { ApiError } from "@/lib/errors";

export { ApiError, ValidationError, type ApiStatus } from "@/lib/errors";

/** Maps any thrown value to a JSON response; unexpected errors are logged and hidden. */
export function errorResponse(e: unknown) {
  if (e instanceof ApiError || e instanceof AuthError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  console.error("[api] unexpected error", e);
  return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
}

/** Parses a JSON object body; anything else becomes {} (validated by the caller). */
export async function readJson(req: Request): Promise<Record<string, unknown>> {
  const body = await req.json().catch(() => null);
  return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
}

export const noStore = { headers: { "Cache-Control": "no-store" } } as const;
