"use client";

/** Browser-side fetch wrapper for our API: same-origin cookies, no cache, French error messages. */
export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { credentials: "same-origin", cache: "no-store", ...init });
  const d = (await r.json().catch(() => ({}))) as T & { error?: string };
  if (!r.ok) throw Object.assign(new Error(d.error ?? `Erreur ${r.status}`), { status: r.status });
  return d;
}

/** RequestInit for a JSON body. */
export const jsonInit = (method: string, body: unknown, headers: Record<string, string> = {}): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json", ...headers },
  body: JSON.stringify(body),
});
