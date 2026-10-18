import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { ApiError, errorResponse, noStore, readJson } from "@/lib/http";
import { getSupabaseServer } from "@/lib/supabase/server";
import { newHeroMediaPath, siteMediaPrefix, SITE_MEDIA_BUCKET } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

/**
 * SUPER ADMIN: one-time signed URL to upload a hero video/poster straight to Storage
 * (videos are too large to pass through a serverless function). Type and size are
 * checked here and again by the bucket (allowed MIME types, 50 MB limit).
 */
export async function POST(req: Request) {
  try {
    await requireSuperAdmin();
    const body = await readJson(req);
    const contentType = String(body.contentType ?? "");
    const path = newHeroMediaPath(contentType, Number(body.size));
    const supabase = await getSupabaseServer();
    const { data, error } = await supabase.storage.from(SITE_MEDIA_BUCKET).createSignedUploadUrl(path);
    if (error || !data) {
      console.error("[site-media] signed upload url", error?.message);
      throw new ApiError(502, "Le stockage ne répond pas. Réessayez dans un instant.");
    }
    return NextResponse.json({ path, token: data.token, bucket: SITE_MEDIA_BUCKET, publicUrl: siteMediaPrefix() + path }, noStore);
  } catch (e) {
    return errorResponse(e);
  }
}
