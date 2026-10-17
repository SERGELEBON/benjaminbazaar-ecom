import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { audit, publicProfile, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseShopInput, slugify } from "@/lib/merchant";

export const dynamic = "force-dynamic";

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

/**
 * "Devenir vendeur": a client (or a Google sign-up) applies for a merchant shop.
 * The account becomes SUPPLIER with a *pending* shop, reviewed by an admin.
 */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (user.role === "ADMIN") return fail(400, "Les administrateurs n'ont pas besoin de boutique.");
    if (user.supplier) return fail(409, "Vous avez déjà une boutique. Consultez son statut dans votre espace marchand.");
    const input = parseShopInput((await req.json().catch(() => ({}))) as Record<string, unknown>);

    const updated = await db.$transaction(async (tx) => {
      let slug = slugify(input.name);
      if (await tx.supplier.findUnique({ where: { slug } })) slug = `${slug}-${user.id.slice(-6)}`;
      await tx.supplier.create({
        data: {
          userId: user.id,
          name: input.name,
          slug,
          phone: input.phone,
          city: input.city,
          country: input.country,
          mainCategory: input.mainCategory,
          description: input.description,
          years: 0,
          verified: false,
          status: "pending",
          storeRating: 0,
          reorderRate: 0,
          onTimeDispatch: 0,
        },
      });
      return tx.user.update({ where: { id: user.id }, data: { role: "SUPPLIER" }, include: { supplier: true } });
    });
    await audit(user.id, "merchant.apply", "supplier", updated.supplier!.id, { shop: input.name });
    return NextResponse.json({ user: publicProfile(updated) }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}

/**
 * Merchant updates their shop details. A *rejected* application is resubmitted
 * (back to pending, reason cleared). A *suspended* shop cannot resubmit itself.
 */
export async function PATCH(req: Request) {
  try {
    const user = await requireUser();
    if (!user.supplier) return fail(404, "Aucune boutique associée à ce compte.");
    if (user.supplier.status === "suspended") {
      return fail(403, "Boutique suspendue : contactez le support pour la réactiver.");
    }
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const input = parseShopInput(body);
    const resubmit = user.supplier.status === "rejected";

    const updated = await db.user.update({
      where: { id: user.id },
      data: {
        supplier: {
          update: {
            name: input.name,
            phone: input.phone,
            city: input.city,
            country: input.country,
            mainCategory: input.mainCategory,
            description: input.description,
            ...(resubmit ? { status: "pending", statusReason: null } : {}),
          },
        },
      },
      include: { supplier: true },
    });
    if (resubmit) await audit(user.id, "merchant.resubmit", "supplier", user.supplier.id, { shop: input.name });
    return NextResponse.json({ user: publicProfile(updated), resubmitted: resubmit });
  } catch (e) {
    return errorResponse(e);
  }
}
