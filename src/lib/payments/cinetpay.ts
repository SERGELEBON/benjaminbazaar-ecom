/**
 * CinetPay (Côte d'Ivoire): Orange Money, MTN MoMo, Moov, Wave and cards on a page
 * hosted by CinetPay — card numbers and wallet PINs never touch our servers.
 *
 * Enabled only when CINETPAY_API_KEY + CINETPAY_SITE_ID (+ CINETPAY_SECRET_KEY for
 * webhook signatures) are set. Payment state is ALWAYS confirmed server-to-server
 * with /payment/check: neither the browser return nor the webhook body is trusted.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const BASE = "https://api-checkout.cinetpay.com/v2";
const TIMEOUT_MS = 15_000;

export type CinetpayConfig = { apikey: string; siteId: string; secret: string | null };

export function cinetpayConfig(): CinetpayConfig | null {
  const apikey = process.env.CINETPAY_API_KEY?.trim();
  const siteId = process.env.CINETPAY_SITE_ID?.trim();
  if (!apikey || !siteId) return null;
  return { apikey, siteId, secret: process.env.CINETPAY_SECRET_KEY?.trim() || null };
}

/** CinetPay only accepts XOF amounts that are multiples of 5. */
export const roundUpTo5 = (amount: number) => Math.ceil(amount / 5) * 5;

async function post(path: string, body: Record<string, unknown>) {
  const r = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  const data = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  return { httpStatus: r.status, data };
}

export async function initCinetpayPayment(
  cfg: CinetpayConfig,
  p: {
    transactionId: string;
    amount: number;
    description: string;
    notifyUrl: string;
    returnUrl: string;
    customer: { name: string; phone: string; email: string; city: string; country: string };
  },
): Promise<{ paymentUrl: string } | { error: string }> {
  const [surname, ...rest] = p.customer.name.split(" ");
  const { data } = await post("/payment", {
    apikey: cfg.apikey,
    site_id: cfg.siteId,
    transaction_id: p.transactionId,
    amount: p.amount,
    currency: "XOF",
    description: p.description.replace(/[^\p{L}\p{N} .,-]/gu, "").slice(0, 100) || "Commande",
    notify_url: p.notifyUrl,
    return_url: p.returnUrl,
    channels: "ALL",
    lang: "fr",
    customer_name: rest.join(" ") || surname,
    customer_surname: surname,
    customer_email: p.customer.email,
    customer_phone_number: p.customer.phone.replace(/[^\d+]/g, ""),
    customer_city: p.customer.city,
    customer_country: "CI",
    customer_address: p.customer.city,
    customer_state: "CI",
    customer_zip_code: "00225",
  });
  const url = (data.data as { payment_url?: string } | undefined)?.payment_url;
  if (String(data.code) === "201" && typeof url === "string" && url.startsWith("https://")) return { paymentUrl: url };
  return { error: String(data.description ?? data.message ?? "Initialisation du paiement refusée") };
}

export type CheckResult = { status: "paid" | "failed" | "pending"; amount: number | null; currency: string | null; raw: string };

/** Authoritative status of a transaction, asked directly to CinetPay. */
export async function checkCinetpayPayment(cfg: CinetpayConfig, transactionId: string): Promise<CheckResult> {
  const { data } = await post("/payment/check", { apikey: cfg.apikey, site_id: cfg.siteId, transaction_id: transactionId });
  const d = (data.data ?? {}) as { status?: string; amount?: string | number; currency?: string };
  const s = String(d.status ?? "").toUpperCase();
  const status: CheckResult["status"] =
    String(data.code) === "00" && s === "ACCEPTED" ? "paid" : s === "REFUSED" || s === "CANCELED" || s === "CANCELLED" ? "failed" : "pending";
  return {
    status,
    amount: d.amount != null && Number.isFinite(Number(d.amount)) ? Number(d.amount) : null,
    currency: d.currency ?? null,
    raw: JSON.stringify({ code: data.code, message: data.message, status: d.status }).slice(0, 500),
  };
}

/** Fields concatenated (in this order) for the x-token HMAC of CinetPay notifications. */
const TOKEN_FIELDS = [
  "cpm_site_id", "cpm_trans_id", "cpm_trans_date", "cpm_amount", "cpm_currency", "signature", "payment_method",
  "cel_phone_num", "cpm_phone_prefixe", "cpm_language", "cpm_version", "cpm_payment_config", "cpm_page_action",
  "cpm_custom", "cpm_designation", "cpm_error_message",
];

/** Verifies the HMAC-SHA256 x-token header of a notification (constant-time compare). */
export function verifyCinetpayToken(fields: Record<string, string>, token: string | null, secret: string): boolean {
  if (!token) return false;
  const expected = createHmac("sha256", secret).update(TOKEN_FIELDS.map((k) => fields[k] ?? "").join("")).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(token.trim().toLowerCase());
  return a.length === b.length && timingSafeEqual(a, b);
}
