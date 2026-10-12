import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const banners = await db.banner.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(banners);
}
