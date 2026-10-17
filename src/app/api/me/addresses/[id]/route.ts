import { NextResponse } from "next/server";
import { authErrorResponse, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { AddressError, parseAddress } from "@/lib/addresses";

type Ctx = { params: Promise<{ id: string }> };
const select = { id: true, name: true, phone: true, country: true, city: true, line: true, zip: true, isDefault: true, createdAt: true } as const;

/** CLIENT: edit an own address, or { isDefault: true } only to make it the default. */
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const current = await db.address.findFirst({ where: { id, userId: user.id } });
    if (!current) return NextResponse.json({ error: "Adresse introuvable" }, { status: 404 });
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const onlyDefault = Object.keys(body).length === 1 && body.isDefault === true;
    const data = onlyDefault ? { isDefault: true } : { ...parseAddress(body), isDefault: body.isDefault === true || current.isDefault };
    const address = await db.$transaction(async (tx) => {
      if (data.isDefault && !current.isDefault) {
        await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
      }
      return tx.address.update({ where: { id }, data, select });
    });
    return NextResponse.json({ address });
  } catch (e) {
    if (e instanceof AddressError) return NextResponse.json({ error: e.message }, { status: 400 });
    return authErrorResponse(e);
  }
}

/** CLIENT: delete an own address; another one becomes the default if needed. */
export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const current = await db.address.findFirst({ where: { id, userId: user.id } });
    if (!current) return NextResponse.json({ error: "Adresse introuvable" }, { status: 404 });
    await db.$transaction(async (tx) => {
      await tx.address.delete({ where: { id } });
      if (current.isDefault) {
        const next = await tx.address.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
        if (next) await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
      }
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return authErrorResponse(e);
  }
}
