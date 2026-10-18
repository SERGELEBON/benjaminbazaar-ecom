import { NextResponse } from "next/server";
import { audit, requireSuperAdmin } from "@/lib/auth";
import { errorResponse, noStore, readJson } from "@/lib/http";
import { getHeroSettings, parseHero, saveHeroSettings } from "@/lib/site-settings";
import { HERO_DEFAULTS } from "@/lib/hero";

export const dynamic = "force-dynamic";

/** SUPER ADMIN: current hero settings + defaults (for "reset"). */
export async function GET() {
  try {
    await requireSuperAdmin();
    return NextResponse.json({ hero: await getHeroSettings(), defaults: HERO_DEFAULTS }, noStore);
  } catch (e) {
    return errorResponse(e);
  }
}

/** SUPER ADMIN: update the home hero (video, poster, texts, overlay). */
export async function PUT(req: Request) {
  try {
    const admin = await requireSuperAdmin();
    const hero = parseHero(await readJson(req));
    await saveHeroSettings(hero, admin.id);
    await audit(admin.id, "site.hero", "site", "hero", { videoUrl: hero.videoUrl, badge: hero.badge || undefined });
    return NextResponse.json({ hero });
  } catch (e) {
    return errorResponse(e);
  }
}
