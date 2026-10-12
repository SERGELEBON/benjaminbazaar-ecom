import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const rfqs = await db.rFQ.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { quotes: true },
  });
  return NextResponse.json(rfqs);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  // Use a demo buyer user
  const user = await db.user.findFirst({ where: { role: "BUYER" } });
  if (!user) return NextResponse.json({ error: "No buyer user" }, { status: 400 });

  const rfq = await db.rFQ.create({
    data: {
      userId: user.id,
      title: body.title,
      category: body.category,
      quantity: body.quantity,
      unit: body.unit || "piece",
      budget: body.budget || null,
      details: body.details,
      attachments: JSON.stringify(body.attachments || []),
      status: "open",
    },
  });
  return NextResponse.json(rfq);
}
