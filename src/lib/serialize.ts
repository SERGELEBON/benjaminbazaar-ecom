import { db } from "./db";
import { PUBLIC_SUPPLIER_WHERE } from "@/lib/merchant";
import type {
  CategoryNode,
  PriceTierT,
  ProductT,
  SupplierT,
} from "./format";

function safeParse<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

export function serializeProduct(p: any): ProductT {
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    description: p.description,
    categoryId: p.categoryId,
    categoryName: p.category?.name,
    supplierId: p.supplierId,
    supplierName: p.supplier?.name,
    supplierVerified: p.supplier?.verified ?? true,
    images: safeParse<string[]>(p.images, []),
    videoUrl: p.videoUrl ?? null,
    minOrder: p.minOrder,
    minOrderUnit: p.minOrderUnit,
    unit: p.unit,
    sold: p.sold,
    popularity: p.popularity,
    rating: p.rating,
    reviewCount: p.reviewCount,
    reorderRate: p.reorderRate,
    lowestPrice: p.lowestPrice,
    certifications: safeParse<string[]>(p.certifications, []),
    keyAttributes: safeParse(p.keyAttributes, []),
    variants: safeParse(p.variantsJson, []),
    tradeAssurance: p.tradeAssurance,
    readyToShip: p.readyToShip,
    customizable: p.customizable,
    rank: p.rank,
    priceTiers: (p.priceTiers ?? [])
      .map((t: any) => ({
        minQty: t.minQty,
        maxQty: t.maxQty,
        price: t.price,
        unit: t.unit,
      }))
      .sort((a: PriceTierT, b: PriceTierT) => a.minQty - b.minQty),
    storeRating: p.supplier?.storeRating,
    responseTime: p.supplier?.responseTime,
    onTimeDispatch: p.supplier?.onTimeDispatch,
    city: p.supplier?.city,
    country: p.supplier?.country,
    years: p.supplier?.years,
  };
}

export function serializeSupplier(s: any): SupplierT {
  return {
    id: s.id,
    name: s.name,
    slug: s.slug,
    logo: s.logo,
    city: s.city,
    country: s.country,
    years: s.years,
    type: s.type,
    verified: s.verified,
    storeRating: s.storeRating,
    responseTime: s.responseTime,
    onTimeDispatch: s.onTimeDispatch,
    reorderRate: s.reorderRate,
    mainCategory: s.mainCategory,
    employees: s.employees,
    annualRevenue: s.annualRevenue,
    certifications: safeParse<string[]>(s.certifications, []),
    markets: safeParse<string[]>(s.markets, []),
    productCount: s._count?.products ?? 0,
  };
}

export function serializeCategoryTree(cats: any[]): CategoryNode[] {
  const map = new Map<string, CategoryNode>();
  cats.forEach((c) =>
    map.set(c.id, {
      id: c.id,
      name: c.name,
      slug: c.slug,
      icon: c.icon,
      parentId: c.parentId,
      order: c.order,
      children: [],
    }),
  );
  const roots: CategoryNode[] = [];
  cats.forEach((c) => {
    const node = map.get(c.id)!;
    if (c.parentId && map.has(c.parentId)) {
      map.get(c.parentId)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });
  roots.sort((a, b) => a.order - b.order);
  map.forEach((n) => n.children!.sort((a, b) => a.order - b.order));
  return roots;
}

export async function getCategories() {
  const cats = await db.category.findMany({ orderBy: { order: "asc" } });
  return serializeCategoryTree(cats);
}

export async function getProducts(opts?: {
  take?: number;
  skip?: number;
  categoryId?: string;
  search?: string;
  supplierId?: string;
  orderBy?: "popular" | "newest" | "priceAsc" | "priceDesc";
  verifiedOnly?: boolean;
  minPrice?: number;
  maxPrice?: number;
}) {
  // Only products of approved merchants are public (pending / rejected / suspended shops are hidden).
  const where: any = { supplier: PUBLIC_SUPPLIER_WHERE };
  if (opts?.categoryId) where.categoryId = opts.categoryId;
  if (opts?.supplierId) where.supplierId = opts.supplierId;
  if (opts?.search) {
    where.OR = [
      { title: { contains: opts.search, mode: "insensitive" } },
      { description: { contains: opts.search, mode: "insensitive" } },
    ];
  }
  let orderBy: any = { popularity: "desc" };
  if (opts?.orderBy === "newest") orderBy = { createdAt: "desc" };
  if (opts?.orderBy === "priceAsc") orderBy = { priceTiers: { _min: { price: "asc" } } };
  if (opts?.orderBy === "priceDesc") orderBy = { priceTiers: { _min: { price: "desc" } } };

  let items = await db.product.findMany({
    where,
    orderBy,
    take: opts?.take ?? 24,
    skip: opts?.skip ?? 0,
    include: {
      supplier: true,
      category: true,
      priceTiers: true,
    },
  });

  // Demo fallback: if a text search yields nothing, return popular products
  // so the search results page always has content to show.
  if (opts?.search && items.length === 0 && (opts.skip ?? 0) === 0) {
    items = await db.product.findMany({
      where: { supplier: PUBLIC_SUPPLIER_WHERE },
      orderBy: { popularity: "desc" },
      take: opts?.take ?? 24,
      skip: 0,
      include: { supplier: true, category: true, priceTiers: true },
    });
  }

  return items.map(serializeProduct);
}

export async function getProductById(id: string) {
  const p = await db.product.findFirst({
    where: { id, supplier: PUBLIC_SUPPLIER_WHERE },
    include: {
      supplier: true,
      category: true,
      priceTiers: true,
      reviews: { take: 8, orderBy: { createdAt: "desc" } },
    },
  });
  if (!p) return null;
  return {
    ...serializeProduct(p),
    reviews: (p.reviews ?? []).map((r: any) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      content: r.content,
      verified: r.verified,
      createdAt: r.createdAt,
    })),
  };
}

export async function getSuppliers() {
  const suppliers = await db.supplier.findMany({
    where: PUBLIC_SUPPLIER_WHERE, // only approved merchants are public
    include: { _count: { select: { products: true } } },
    orderBy: { storeRating: "desc" },
  });
  return suppliers.map(serializeSupplier);
}

export async function getSupplierById(id: string) {
  const s = await db.supplier.findFirst({
    where: { id, ...PUBLIC_SUPPLIER_WHERE },
    include: {
      products: {
        take: 24,
        include: { priceTiers: true, category: true },
        orderBy: { popularity: "desc" },
      },
      _count: { select: { products: true } },
    },
  });
  if (!s) return null;
  return {
    ...serializeSupplier({ ...s, _count: { products: s._count.products } }),
    products: s.products.map((p) =>
      serializeProduct({ ...p, supplier: s }),
    ),
  };
}
