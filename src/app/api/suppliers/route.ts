import { NextResponse } from "next/server";
import { getSuppliers } from "@/lib/serialize";

export async function GET() {
  const suppliers = await getSuppliers();
  return NextResponse.json(suppliers);
}
