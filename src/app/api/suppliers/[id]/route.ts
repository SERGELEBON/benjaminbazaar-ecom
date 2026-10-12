import { NextRequest, NextResponse } from "next/server";
import { getSupplierById } from "@/lib/serialize";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supplier = await getSupplierById(id);
  if (!supplier) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(supplier);
}
