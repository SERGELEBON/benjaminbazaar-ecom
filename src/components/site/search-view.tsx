"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Star, BadgeCheck, MessageCircle, ChevronRight, ChevronLeft, SlidersHorizontal,
  X,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { formatPrice, type ProductT, type CategoryNode } from "@/lib/format";
import { ProductCard } from "./product-card";
import { CatIcon } from "./cat-icon";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";

type OrderBy = "popular" | "priceAsc" | "priceDesc" | "newest";

const TABS = ["AI Mode", "Products", "Suppliers", "Worldwide"] as const;

const COUNTRIES = ["All", "China", "Ghana", "India", "Vietnam", "Turkey"];
const MGMT_CERTS = ["ISO9001", "BSCI", "WRAP"];
const PROD_CERTS = ["CE", "RoHS", "FCC", "FDA", "HALAL"];
const RATINGS = [
  { k: "5.0", v: "5.0" },
  { k: "4.5", v: "4.5+" },
  { k: "4.0", v: "4.0+" },
];

function Stars({ n, className = "" }: { n: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Star
          key={i}
          className={`w-3 h-3 ${i < Math.round(n) ? "fill-[#FF6A00] text-[#FF6A00]" : "text-[#DADAD9]"}`}
          strokeWidth={1.6}
        />
      ))}
    </span>
  );
}

function Skeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white border border-[#DADAD9]">
          <div className="aspect-square bg-[#ECECEC] animate-pulse" />
          <div className="p-3 space-y-2">
            <div className="h-3 w-full bg-[#ECECEC] animate-pulse" />
            <div className="h-3 w-2/3 bg-[#ECECEC] animate-pulse" />
            <div className="h-4 w-1/3 bg-[#ECECEC] animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

function Checkbox({
  checked, onChange, label, count,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  count?: string;
}) {
  return (
    <label className="flex items-center gap-2 py-1.5 cursor-pointer group text-[12px] text-[#333] hover:text-[#FF6A00]">
      <span
        className={`w-3.5 h-3.5 border flex items-center justify-center ${
          checked ? "bg-[#FF6A00] border-[#FF6A00]" : "bg-white border-[#999] group-hover:border-[#FF6A00]"
        }`}
        onClick={(e) => { e.preventDefault(); onChange(!checked); }}
      >
        {checked && <span className="text-white text-[9px] font-bold leading-none">✓</span>}
      </span>
      <span className="flex-1">{label}</span>
      {count && <span className="text-[#999] text-[11px]">{count}</span>}
    </label>
  );
}

function FiltersBody({
  categories, filters, setF, onPickCategory,
}: {
  categories: CategoryNode[];
  filters: Record<string, unknown>;
  setF: (k: string, v: unknown) => void;
  onPickCategory: (id: string | null) => void;
}) {
  const [expandedCats, setExpandedCats] = useState<string | null>(null);
  return (
    <div className="space-y-4">
      {/* Ready to ship / Trade Assurance */}
      <div>
        <div className="benjamin-section-title mb-1.5">Refine by</div>
        <Checkbox
          checked={!!filters.tradeAssurance}
          onChange={(v) => setF("tradeAssurance", v)}
          label="Trade Assurance"
        />
        <Checkbox
          checked={!!filters.verified}
          onChange={(v) => setF("verified", v)}
          label="Verified supplier"
        />
        <Checkbox
          checked={!!filters.paidSamples}
          onChange={(v) => setF("paidSamples", v)}
          label="Paid samples"
        />
        <Checkbox
          checked={!!filters.readyToShip}
          onChange={(v) => setF("readyToShip", v)}
          label="Ready to ship"
        />
      </div>

      {/* Store rating */}
      <div className="border-t border-[#ECECEC] pt-3">
        <div className="benjamin-section-title mb-1.5">Store rating</div>
        <div className="space-y-1">
          {RATINGS.map((r) => (
            <label
              key={r.k}
              className="flex items-center gap-2 py-1 text-[12px] cursor-pointer hover:text-[#FF6A00]"
            >
              <input
                type="radio"
                name="rating"
                className="accent-[#FF6A00]"
                checked={(filters.rating as string) === r.k}
                onChange={() => setF("rating", r.k)}
              />
              <Stars n={parseFloat(r.k)} />
              <span>{r.v}</span>
            </label>
          ))}
          <button
            className="text-[11px] text-[#337AB7] underline mt-0.5"
            onClick={() => setF("rating", null)}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Categories */}
      <div className="border-t border-[#ECECEC] pt-3">
        <div className="benjamin-section-title mb-1.5">Categories</div>
        <div className="max-h-56 overflow-y-auto benjamin-scroll -mr-2 pr-2">
          {categories.map((c) => (
            <div key={c.id}>
              <button
                onClick={() => onPickCategory(c.id)}
                className="w-full flex items-center gap-2 py-1.5 text-[12px] text-left hover:text-[#FF6A00]"
              >
                <CatIcon name={c.icon} className="w-3.5 h-3.5 shrink-0 text-[#FF6A00]" />
                <span className="flex-1 truncate">{c.name}</span>
                {c.children?.length ? (
                  <ChevronRight
                    className={`w-3 h-3 transition-transform ${expandedCats === c.id ? "rotate-90" : ""}`}
                    onClick={(e) => { e.stopPropagation(); setExpandedCats(expandedCats === c.id ? null : c.id); }}
                  />
                ) : null}
              </button>
              {expandedCats === c.id && c.children?.length ? (
                <div className="pl-4">
                  {c.children.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => onPickCategory(s.id)}
                      className="block w-full text-left py-1 text-[11px] text-[#555] hover:text-[#FF6A00] hover:underline"
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {/* Price range */}
      <div className="border-t border-[#ECECEC] pt-3">
        <div className="benjamin-section-title mb-1.5">Price (GHS)</div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            value={(filters.minPrice as string) ?? ""}
            onChange={(e) => setF("minPrice", e.target.value)}
            className="w-full h-8 border border-[#DADAD9] px-2 text-[12px] outline-none focus:border-[#FF6A00]"
          />
          <span className="text-[#999]">—</span>
          <input
            type="number"
            placeholder="Max"
            value={(filters.maxPrice as string) ?? ""}
            onChange={(e) => setF("maxPrice", e.target.value)}
            className="w-full h-8 border border-[#DADAD9] px-2 text-[12px] outline-none focus:border-[#FF6A00]"
          />
        </div>
        <button className="btn-outline-grey w-full mt-2 text-[11px]">Apply</button>
      </div>

      {/* Min order */}
      <div className="border-t border-[#ECECEC] pt-3">
        <div className="benjamin-section-title mb-1.5">Min. order</div>
        <input
          type="number"
          placeholder="e.g. 100"
          value={(filters.minOrder as string) ?? ""}
          onChange={(e) => setF("minOrder", e.target.value)}
          className="w-full h-8 border border-[#DADAD9] px-2 text-[12px] outline-none focus:border-[#FF6A00]"
        />
      </div>

      {/* Supplier country */}
      <div className="border-t border-[#ECECEC] pt-3">
        <div className="benjamin-section-title mb-1.5">Supplier country</div>
        <select
          value={(filters.country as string) ?? "All"}
          onChange={(e) => setF("country", e.target.value)}
          className="w-full h-8 border border-[#DADAD9] px-2 text-[12px] outline-none bg-white focus:border-[#FF6A00]"
        >
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Management certs */}
      <div className="border-t border-[#ECECEC] pt-3">
        <div className="benjamin-section-title mb-1.5">Management certifications</div>
        {MGMT_CERTS.map((c) => (
          <Checkbox
            key={c}
            checked={Array.isArray(filters.mgmtCerts) && (filters.mgmtCerts as string[]).includes(c)}
            onChange={(v) => {
              const cur = (filters.mgmtCerts as string[]) ?? [];
              setF("mgmtCerts", v ? [...cur, c] : cur.filter((x) => x !== c));
            }}
            label={c}
          />
        ))}
      </div>

      {/* Product certs */}
      <div className="border-t border-[#ECECEC] pt-3">
        <div className="benjamin-section-title mb-1.5">Product certifications</div>
        {PROD_CERTS.map((c) => (
          <Checkbox
            key={c}
            checked={Array.isArray(filters.prodCerts) && (filters.prodCerts as string[]).includes(c)}
            onChange={(v) => {
              const cur = (filters.prodCerts as string[]) ?? [];
              setF("prodCerts", v ? [...cur, c] : cur.filter((x) => x !== c));
            }}
            label={c}
          />
        ))}
      </div>
    </div>
  );
}

export function SearchView({ categories }: { categories: CategoryNode[] }) {
  const {
    searchQuery, categoryId, setCategoryId, setSearchQuery,
    setView, addToCart, filters, resetFilters,
  } = useApp();

  const [products, setProducts] = useState<ProductT[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [skip, setSkip] = useState(0);
  const [orderBy, setOrderBy] = useState<OrderBy>("popular");
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("Products");
  const [sheetOpen, setSheetOpen] = useState(false);
  const take = 24;

  const setF = useCallback((k: string, v: unknown) => {
    useApp.setState((s) => {
      const fc = { ...s.filters };
      if (v === null || v === "" || v === false || (Array.isArray(v) && v.length === 0)) {
        delete fc[k];
      } else {
        fc[k] = v;
      }
      return { filters: fc };
    });
  }, []);

  // Reset skip & fetch when key dependencies change
  useEffect(() => {
    setSkip(0);
  }, [searchQuery, categoryId, orderBy]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const url = searchQuery.trim()
          ? `/api/search?q=${encodeURIComponent(searchQuery)}&take=${take}&skip=${skip}&categoryId=${categoryId ?? ""}&orderBy=${orderBy}`
          : `/api/products?take=${take}&skip=${skip}&categoryId=${categoryId ?? ""}&orderBy=${orderBy}`;
        const res = await fetch(url);
        const d = await res.json();
        if (cancelled) return;
        setProducts(d.products ?? []);
        setTotal(d.total ?? d.totalEstimate ?? 0);
      } catch {
        if (!cancelled) {
          setProducts([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchQuery, categoryId, orderBy, skip]);

  // Client-side filtering on top of server fetch
  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (filters.tradeAssurance && !p.tradeAssurance) return false;
      if (filters.verified && !p.supplierVerified) return false;
      if (filters.readyToShip && !p.readyToShip) return false;
      if (filters.rating && p.rating < parseFloat(filters.rating as string)) return false;
      if (filters.country && filters.country !== "All" && p.country !== filters.country) return false;
      if (filters.minPrice) {
        const minTier = p.priceTiers.length ? Math.min(...p.priceTiers.map((t) => t.price)) : 0;
        if (minTier < parseFloat(filters.minPrice as string)) return false;
      }
      if (filters.maxPrice) {
        const maxTier = p.priceTiers.length ? Math.max(...p.priceTiers.map((t) => t.price)) : 0;
        if (maxTier > parseFloat(filters.maxPrice as string)) return false;
      }
      if (Array.isArray(filters.prodCerts) && (filters.prodCerts as string[]).length) {
        const arr = filters.prodCerts as string[];
        if (!arr.every((c) => p.certifications.includes(c))) return false;
      }
      return true;
    });
  }, [products, filters]);

  const pageCount = Math.max(1, Math.ceil(total / take));
  const page = Math.floor(skip / take) + 1;

  const pageNumbers = useMemo(() => {
    const arr: number[] = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(pageCount, start + 4);
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
  }, [page, pageCount]);

  const breadcrumbCat = useMemo(() => {
    if (!categoryId) return null;
    for (const c of categories) {
      if (c.id === categoryId) return c;
      const sub = c.children?.find((s) => s.id === categoryId);
      if (sub) return sub;
    }
    return null;
  }, [categoryId, categories]);

  function handleAddToCart(p: ProductT) {
    const tier = p.priceTiers[p.priceTiers.length - 1];
    addToCart({
      productId: p.id,
      title: p.title,
      image: p.images[0] ?? "",
      price: tier ? tier.price : 0,
      quantity: 1,
      unit: p.unit,
      supplierId: p.supplierId,
      supplierName: p.supplierName ?? "",
    });
    toast.success("Added to cart", { description: p.title.slice(0, 80) });
  }

  function pickCategory(id: string | null) {
    setCategoryId(id);
    setSheetOpen(false);
  }

  return (
    <div className="bg-[#f4f1ec] min-h-screen">
      {/* TABS */}
      <div className="bg-white border-b border-[#ECECEC]">
        <div className="max-w-[1280px] mx-auto px-3 lg:px-6 flex items-center h-10 gap-1 overflow-x-auto benjamin-scroll">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-3 h-8 text-[12px] font-semibold uppercase tracking-wide ${
                activeTab === t
                  ? "bg-[#000] text-white"
                  : "bg-[#ECECEC] text-[#333] hover:bg-[#DADAD9]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* HEADER LINE + SORT */}
      <div className="bg-white border-b border-[#ECECEC]">
        <div className="max-w-[1280px] mx-auto px-3 lg:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="text-[12px] text-[#555]">
            <button
              onClick={() => setView("home")}
              className="hover:text-[#FF6A00] hover:underline"
            >
              Home
            </button>
            {breadcrumbCat && (
              <>
                <span className="mx-1 text-[#DADAD9]">›</span>
                <button
                  onClick={() => pickCategory(breadcrumbCat.id)}
                  className="text-[#333] hover:text-[#FF6A00] hover:underline"
                >
                  {breadcrumbCat.name}
                </button>
              </>
            )}
            <span className="mx-2 text-[#DADAD9]">|</span>
            <span className="text-[#333] font-semibold">
              Showing {total.toLocaleString()}+ products
            </span>
            {searchQuery.trim() && (
              <>
                {" "}for <span className="text-[#FF6A00] font-semibold">'{searchQuery}'</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="lg:hidden btn-outline-grey flex items-center gap-1.5"
              onClick={() => setSheetOpen(true)}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" /> Filters
            </button>
            <label className="flex items-center gap-2 text-[12px]">
              <span className="text-[#888]">Sort by</span>
              <select
                value={orderBy}
                onChange={(e) => setOrderBy(e.target.value as OrderBy)}
                className="h-8 border border-[#DADAD9] px-2 text-[12px] outline-none bg-white focus:border-[#FF6A00]"
              >
                <option value="popular">Relevance</option>
                <option value="priceAsc">Price: low to high</option>
                <option value="priceDesc">Price: high to low</option>
                <option value="newest">Newest</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      {/* BODY */}
      <div className="max-w-[1280px] mx-auto px-3 lg:px-6 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
          {/* LEFT FILTERS (desktop) */}
          <aside className="hidden lg:block">
            <div className="bg-white border border-[#DADAD9] p-4 sticky top-[124px]">
              <div className="flex items-center justify-between mb-2">
                <div className="benjamin-section-title">Filters</div>
                <button
                  onClick={resetFilters}
                  className="text-[11px] text-[#337AB7] hover:text-[#FF6A00] underline"
                >
                  Clear all
                </button>
              </div>
              <FiltersBody
                categories={categories}
                filters={filters}
                setF={setF}
                onPickCategory={pickCategory}
              />
            </div>
          </aside>

          {/* RIGHT GRID */}
          <div>
            {loading ? (
              <Skeleton count={10} />
            ) : filtered.length === 0 ? (
              <div className="bg-white border border-[#DADAD9] p-12 text-center">
                <div className="text-[16px] font-bold text-[#333] mb-2">
                  No products found
                </div>
                <p className="text-[12px] text-[#888] mb-4">
                  Try adjusting your filters or search terms.
                </p>
                <button
                  onClick={() => {
                    resetFilters();
                    setCategoryId(null);
                    setSearchQuery("");
                  }}
                  className="btn-benjamin-orange"
                >
                  Reset search
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {filtered.map((p) => (
                  <div key={p.id} className="flex flex-col">
                    <ProductCard product={p} />
                    {/* under-card meta */}
                    <div className="bg-white border border-t-0 border-[#DADAD9] px-3 pb-2.5 -mt-px">
                      <div className="flex items-center gap-1 text-[11px] text-[#666] mb-1.5">
                        {p.supplierVerified && (
                          <BadgeCheck className="w-3.5 h-3.5 text-[#16A34A]" strokeWidth={2} />
                        )}
                        <span className="truncate">{p.supplierName}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-[#888] mb-2">
                        <Stars n={p.rating} />
                        <span className="font-semibold text-[#333]">{p.rating.toFixed(1)}</span>
                        <span>({p.reviewCount})</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() => handleAddToCart(p)}
                          className="btn-square-black text-[10px] py-1.5"
                        >
                          Add to cart
                        </button>
                        <button
                          onClick={() => {
                            useApp.getState().setChatSupplierId(p.supplierId);
                            useApp.getState().setChatProductId(p.id);
                            useApp.getState().setView("chat");
                          }}
                          className="btn-benjamin-orange text-[10px] py-1.5 flex items-center justify-center gap-1"
                        >
                          <MessageCircle className="w-3 h-3" /> Chat now
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* PAGINATION */}
            {!loading && filtered.length > 0 && (
              <div className="flex items-center justify-center gap-1 mt-6 flex-wrap">
                <button
                  className="benjamin-nav-btn"
                  disabled={page === 1}
                  onClick={() => setSkip(Math.max(0, skip - take))}
                  aria-label="Previous"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {pageNumbers.map((n) => (
                  <button
                    key={n}
                    className={`benjamin-nav-btn ${n === page ? "!bg-[#FF6A00] !border-[#FF6A00]" : ""}`}
                    onClick={() => setSkip((n - 1) * take)}
                  >
                    {n}
                  </button>
                ))}
                {pageCount > pageNumbers[pageNumbers.length - 1] && (
                  <span className="px-1 text-[#999]">…</span>
                )}
                <button
                  className="benjamin-nav-btn"
                  disabled={page >= pageCount}
                  onClick={() => setSkip(skip + take)}
                  aria-label="Next"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE FILTERS SHEET */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="left" className="w-[300px] sm:max-w-[340px] overflow-y-auto benjamin-scroll p-0">
          <SheetHeader className="bg-[#000] text-white p-3 flex flex-row items-center justify-between gap-2">
            <SheetTitle className="text-white text-[13px] uppercase tracking-wide font-bold">
              ▼ Filters
            </SheetTitle>
          </SheetHeader>
          <div className="p-3">
            <FiltersBody
              categories={categories}
              filters={filters}
              setF={setF}
              onPickCategory={pickCategory}
            />
            <button
              onClick={() => setSheetOpen(false)}
              className="btn-benjamin-orange w-full mt-4"
            >
              Show {total.toLocaleString()}+ results
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
