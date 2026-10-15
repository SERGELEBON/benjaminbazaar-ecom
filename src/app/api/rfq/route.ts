import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { authErrorResponse, requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Signed-in user's RFQs (admins see all). */
export async function GET() {
  try {
    const user = await requireUser();
    const rfqs = await db.rFQ.findMany({
      where: user.role === "ADMIN" ? {} : { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { quotes: true },
    });
    return NextResponse.json(rfqs);
  } catch (e) {
    return authErrorResponse(e);
  }
}

/** Create an RFQ for the signed-in user. */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const str = (v: unknown, max: number) =>
      typeof v === "string" || typeof v === "number" ? String(v).trim().slice(0, max) : "";
    const title = str(body.title, 200);
    const details = str(body.details, 5000);
    if (!title) return NextResponse.json({ error: "Le nom du produit est requis" }, { status: 400 });

    const rfq = await db.rFQ.create({
      data: {
        userId: user.id,
        title,
        category: str(body.category, 120) || "Autre",
        quantity: str(body.quantity, 40) || "1",
        unit: str(body.unit, 40) || "piece",
        budget: str(body.budget, 60) || null,
        details,
        attachments: JSON.stringify(Array.isArray(body.attachments) ? body.attachments.slice(0, 10) : []),
        status: "open",
      },
    });
    return NextResponse.json(rfq, { status: 201 });
  } catch (e) {
    return authErrorResponse(e);
  }
}
