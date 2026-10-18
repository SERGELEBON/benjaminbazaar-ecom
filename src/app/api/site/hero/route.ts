import { NextResponse } from "next/server";
import { getHeroSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

/** PUBLIC: home hero settings (cached briefly at the edge). */
export async function GET() {
  const hero = await getHeroSettings();
  return NextResponse.json({ hero }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}
