import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { settlePayment } from "@/lib/orders";
import { afterResponse } from "@/lib/email";
import { notifyPaymentResult } from "@/lib/notifications";
import { checkCinetpayPayment, cinetpayConfig, verifyCinetpayToken } from "@/lib/payments/cinetpay";

export const dynamic = "force-dynamic";

/** CinetPay pings the notification URL with GET when it is configured. */
export async function GET() {
  return NextResponse.json({ ok: true });
}

/**
 * CinetPay webhook (public). Defence in depth:
 *   1. HMAC x-token checked when CINETPAY_SECRET_KEY is set (constant-time);
 *   2. the transaction must be one of ours;
 *   3. the status is re-read from CinetPay (/payment/check) — the body is never trusted;
 *   4. settlement is idempotent (replays are harmless).
 * Always answers 200 quickly once handled so CinetPay stops retrying.
 */
export async function POST(req: Request) {
  const cfg = cinetpayConfig();
  if (!cfg) return NextResponse.json({ error: "disabled" }, { status: 404 });

  const type = req.headers.get("content-type") ?? "";
  let fields: Record<string, string> = {};
  try {
    if (type.includes("application/json")) {
      const j = (await req.json()) as Record<string, unknown>;
      fields = Object.fromEntries(Object.entries(j).map(([k, v]) => [k, String(v ?? "")]));
    } else {
      const f = await req.formData();
      fields = Object.fromEntries([...f.entries()].map(([k, v]) => [k, typeof v === "string" ? v : ""]));
    }
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  if (cfg.secret && !verifyCinetpayToken(fields, req.headers.get("x-token"), cfg.secret)) {
    console.warn("[cinetpay] invalid x-token", { trans: fields.cpm_trans_id });
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }
  if (fields.cpm_site_id && fields.cpm_site_id !== cfg.siteId) {
    return NextResponse.json({ error: "unknown site" }, { status: 400 });
  }

  const transactionId = (fields.cpm_trans_id ?? "").slice(0, 80);
  const payment = transactionId ? await db.payment.findUnique({ where: { transactionId } }) : null;
  if (!payment || payment.provider !== "cinetpay") return NextResponse.json({ ok: true }); // not ours: ignore

  try {
    const result = await checkCinetpayPayment(cfg, transactionId);
    const settled = await settlePayment(payment.id, result);
    if (settled && settled.status !== payment.status) afterResponse(() => notifyPaymentResult(payment.id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[cinetpay] check failed", e);
    return NextResponse.json({ error: "retry" }, { status: 503 }); // CinetPay will retry
  }
}
