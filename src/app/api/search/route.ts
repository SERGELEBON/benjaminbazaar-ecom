import { NextRequest, NextResponse } from "next/server";
import { getProducts } from "@/lib/serialize";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const take = Number(searchParams.get("take") ?? 24);
  const skip = Number(searchParams.get("skip") ?? 0);
  const categoryId = searchParams.get("categoryId") || undefined;
  const orderBy = (searchParams.get("orderBy") as any) || "popular";

  const products = await getProducts({ take, skip, search: q, categoryId, orderBy });

  return NextResponse.json({
    products,
    query: q,
    totalEstimate: 100000 + products.length * 13,
  });
}
