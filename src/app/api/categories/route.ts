import { NextResponse } from "next/server";
import { getCategories } from "@/lib/serialize";

export async function GET() {
  const cats = await getCategories();
  return NextResponse.json(cats);
}
