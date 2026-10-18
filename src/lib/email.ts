/**
 * Transactional e-mail via Resend (server only).
 *
 * - Disabled (logged, not sent) while RESEND_API_KEY is not set: the site works without it.
 * - Never blocks or fails the user's request: sending runs after the response
 *   (`after`) and errors are only logged.
 * - Every dynamic value is HTML-escaped; links only point to our own site.
 * - An idempotency key per event avoids duplicate e-mails on retries.
 */
import { after } from "next/server";
import { BRAND } from "@/lib/brand";

export type Mail = {
  to: string | string[];
  subject: string;
  /** Short paragraphs (plain text, escaped when rendered). */
  lines: string[];
  /** Key/value rows (order ref, total…). */
  rows?: [string, string][];
  /** Call to action: path on our site (e.g. "/?view=orders"). */
  cta?: { label: string; path: string };
  idempotencyKey?: string;
};

const RESEND_URL = "https://api.resend.com/emails";

export function emailEnabled() {
  return Boolean(process.env.RESEND_API_KEY);
}

/** Public site URL used in e-mails (never taken from the request). */
export function siteUrl() {
  const explicit = process.env.APP_URL?.replace(/\/$/, "");
  if (explicit) return explicit;
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return prod ? `https://${prod}` : "http://localhost:3000";
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function renderMail(m: Mail) {
  const url = m.cta ? `${siteUrl()}${m.cta.path.startsWith("/") ? m.cta.path : `/${m.cta.path}`}` : null;
  const rows = (m.rows ?? [])
    .map(([k, v]) => `<tr><td style="padding:6px 0;color:#666;font-size:13px">${esc(k)}</td><td style="padding:6px 0;text-align:right;font-size:13px;font-weight:600">${esc(v)}</td></tr>`)
    .join("");
  const html = `<!doctype html><html lang="fr"><body style="margin:0;background:#f4f1ec;font-family:Arial,Helvetica,sans-serif;color:#222">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ec;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #dadad9">
<tr><td style="background:${BRAND.colors.primaryDark};padding:16px 20px;color:#fff;font-size:18px;font-weight:800">${esc(BRAND.shortName)} <span style="color:${BRAND.colors.orange};font-size:12px;font-weight:600">${esc(BRAND.name)}</span></td></tr>
<tr><td style="padding:22px 20px">
<h1 style="margin:0 0 12px;font-size:18px">${esc(m.subject)}</h1>
${m.lines.map((l) => `<p style="margin:0 0 10px;font-size:14px;line-height:1.5">${esc(l)}</p>`).join("")}
${rows ? `<table role="presentation" width="100%" style="border-top:1px solid #ececec;border-bottom:1px solid #ececec;margin:12px 0">${rows}</table>` : ""}
${url ? `<p style="margin:18px 0 0"><a href="${esc(url)}" style="background:${BRAND.colors.orange};color:#fff;text-decoration:none;font-weight:700;font-size:13px;padding:11px 18px;display:inline-block;text-transform:uppercase">${esc(m.cta!.label)}</a></p>` : ""}
</td></tr>
<tr><td style="padding:14px 20px;background:#fafafa;color:#888;font-size:11px;line-height:1.5">E-mail automatique envoyé par ${esc(BRAND.name)} suite à une action sur votre compte. Ne communiquez jamais vos codes Mobile Money ou bancaires : notre équipe ne vous les demandera jamais.</td></tr>
</table></td></tr></table></body></html>`;
  const text = [
    m.subject,
    "",
    ...m.lines,
    ...(m.rows?.length ? ["", ...m.rows.map(([k, v]) => `${k} : ${v}`)] : []),
    ...(url ? ["", `${m.cta!.label} : ${url}`] : []),
    "",
    `— ${BRAND.name}`,
  ].join("\n");
  return { html, text };
}

/** Sends now (awaitable). Returns false when disabled or on failure. */
export async function sendMail(m: Mail): Promise<boolean> {
  // Valid addresses only; system / placeholder accounts (*.invalid) never receive mail.
  const to = (Array.isArray(m.to) ? m.to : [m.to]).filter((a) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a) && !/\.invalid$/i.test(a));
  if (!to.length) return false;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info("[email] disabled (RESEND_API_KEY missing):", m.subject);
    return false;
  }
  const { html, text } = renderMail(m);
  try {
    const r = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        ...(m.idempotencyKey ? { "Idempotency-Key": m.idempotencyKey.slice(0, 256) } : {}),
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || `${BRAND.shortName} <onboarding@resend.dev>`,
        to,
        subject: m.subject,
        html,
        text,
        ...(process.env.EMAIL_REPLY_TO ? { reply_to: process.env.EMAIL_REPLY_TO } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) {
      console.error("[email] resend error", r.status, (await r.text().catch(() => "")).slice(0, 300));
      return false;
    }
    return true;
  } catch (e) {
    console.error("[email] send failed", e instanceof Error ? e.message : e);
    return false;
  }
}

/** Runs a notification task after the HTTP response (falls back to fire-and-forget outside a request). */
export function afterResponse(task: () => Promise<unknown>) {
  const run = () => task().catch((e) => console.error("[email] task failed", e instanceof Error ? e.message : e));
  try {
    after(run);
  } catch {
    void run();
  }
}
