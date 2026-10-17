import { NextResponse } from "next/server";
import { availablePaymentMethods } from "@/lib/orders";
import { noStore } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Payment methods currently enabled (online payment only when the provider keys are configured). */
export async function GET() {
  return NextResponse.json({ methods: availablePaymentMethods(), currency: "XOF" }, noStore);
}
