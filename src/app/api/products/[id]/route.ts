import { NextRequest, NextResponse } from "next/server";
import { getProductById, getProducts } from "@/lib/serialize";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const related = await getProducts({ take: 12, categoryId: product.categoryId });
  return NextResponse.json({ product, related });
}
