import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiError, errorResponse, noStore } from "@/lib/http";
import { settlePayment } from "@/lib/orders";
import { checkCinetpayPayment, cinetpayConfig } from "@/lib/payments/cinetpay";

export const dynamic = "force-dynamic";

/**
 * Payment status for its owner (return page). If still pending, asks the provider
 * directly (reconciliation) so the result does not depend on the webhook alone.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    let payment = await db.payment.findFirst({ where: { id, userId: user.id } });
    if (!payment) throw new ApiError(404, "Paiement introuvable");

    const cfg = cinetpayConfig();
    if (payment.provider === "cinetpay" && payment.status === "pending" && cfg) {
      const result = await checkCinetpayPayment(cfg, payment.transactionId).catch(() => null);
      if (result) payment = (await settlePayment(payment.id, result)) ?? payment;
    }
    const orders = await db.order.findMany({ where: { paymentId: id }, select: { id: true, ref: true, status: true, paymentStatus: true, total: true } });
    return NextResponse.json(
      { payment: { id: payment.id, provider: payment.provider, status: payment.status, amount: payment.amount, paymentUrl: payment.status === "pending" ? payment.paymentUrl : null }, orders },
      noStore,
    );
  } catch (e) {
    return errorResponse(e);
  }
}
