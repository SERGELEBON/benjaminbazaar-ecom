import { NextResponse } from "next/server";
import { authErrorResponse, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { AddressError, MAX_ADDRESSES, parseAddress } from "@/lib/addresses";

export const dynamic = "force-dynamic";

const select = { id: true, name: true, phone: true, country: true, city: true, line: true, zip: true, isDefault: true, createdAt: true } as const;

/** CLIENT: own delivery addresses (default first). */
export async function GET() {
  try {
    const user = await requireUser();
    const addresses = await db.address.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      select,
    });
    return NextResponse.json({ addresses }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return authErrorResponse(e);
  }
}

/** CLIENT: add an address. The first one becomes the default automatically. */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const input = parseAddress((await req.json().catch(() => ({}))) as Record<string, unknown>);
    const count = await db.address.count({ where: { userId: user.id } });
    if (count >= MAX_ADDRESSES) return NextResponse.json({ error: `${MAX_ADDRESSES} adresses maximum.` }, { status: 409 });
    const isDefault = input.isDefault || count === 0;
    const address = await db.$transaction(async (tx) => {
      if (isDefault) await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
      return tx.address.create({ data: { ...input, isDefault, userId: user.id }, select });
    });
    return NextResponse.json({ address }, { status: 201 });
  } catch (e) {
    if (e instanceof AddressError) return NextResponse.json({ error: e.message }, { status: 400 });
    return authErrorResponse(e);
  }
}
