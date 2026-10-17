import { NextResponse } from "next/server";
import { audit, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiError, errorResponse, readJson } from "@/lib/http";
import { abortPayment, parseCheckoutInput, placeOrder } from "@/lib/orders";
import { cinetpayConfig, initCinetpayPayment } from "@/lib/payments/cinetpay";

export const dynamic = "force-dynamic";

function appUrl(req: Request) {
  return (process.env.APP_URL?.replace(/\/$/, "") || new URL(req.url).origin);
}

/**
 * Places the order(s). Requires an `Idempotency-Key` header (one per checkout page):
 * retries return the same orders. For online payment, returns the provider URL.
 */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const input = parseCheckoutInput(await readJson(req), req.headers.get("idempotency-key"));
    const result = await placeOrder(user, input);

    let paymentUrl: string | null = null;
    if (result.provider === "cinetpay") {
      const payment = await db.payment.findUniqueOrThrow({ where: { id: result.paymentId } });
      if (payment.status === "pending" && payment.paymentUrl) {
        paymentUrl = payment.paymentUrl; // replayed request: same payment page
      } else if (payment.status === "pending") {
        const cfg = cinetpayConfig();
        if (!cfg) throw new ApiError(503, "Paiement en ligne indisponible.");
        const address = await db.address.findFirst({ where: { id: input.addressId, userId: user.id } });
        const base = appUrl(req);
        const init = await initCinetpayPayment(cfg, {
          transactionId: payment.transactionId,
          amount: payment.amount,
          description: `Commande ${result.orders.map((o) => o.ref).join(" ")}`,
          notifyUrl: `${base}/api/payments/cinetpay/notify`,
          returnUrl: `${base}/?payment=${payment.id}`,
          customer: {
            name: address?.name || user.name || "Client",
            phone: address?.phone || user.phone || "",
            email: user.email,
            city: address?.city || "Abidjan",
            country: address?.country || "Côte d'Ivoire",
          },
        }).catch((e: unknown) => ({ error: e instanceof Error ? e.message : "timeout" }));
        if ("error" in init) {
          await abortPayment(payment.id, init.error);
          throw new ApiError(502, "Le service de paiement ne répond pas. Votre commande a été annulée, réessayez dans un instant.");
        }
        paymentUrl = init.paymentUrl;
        await db.payment.update({ where: { id: payment.id }, data: { paymentUrl } });
      }
    }

    await audit(user.id, "order.checkout", "user", user.id, { refs: result.orders.map((o) => o.ref), provider: result.provider });
    return NextResponse.json({ ...result, paymentUrl }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
