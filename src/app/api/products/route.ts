import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getProducts } from "@/lib/serialize";
import { PUBLIC_SUPPLIER_WHERE } from "@/lib/merchant";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const take = Number(searchParams.get("take") ?? 24);
  const skip = Number(searchParams.get("skip") ?? 0);
  const categoryId = searchParams.get("categoryId") || undefined;
  const search = searchParams.get("q") || undefined;
  const supplierId = searchParams.get("supplierId") || undefined;
  const orderBy = (searchParams.get("orderBy") as any) || "popular";

  const products = await getProducts({ take, skip, categoryId, search, supplierId, orderBy });

  const where: any = { supplier: PUBLIC_SUPPLIER_WHERE };
  if (categoryId) where.categoryId = categoryId;
  if (supplierId) where.supplierId = supplierId;
  if (search) where.OR = [{ title: { contains: search, mode: "insensitive" } }, { description: { contains: search, mode: "insensitive" } }];
  const total = await db.product.count({ where });

  return NextResponse.json({ products, total });
}
