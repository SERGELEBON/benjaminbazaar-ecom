"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Star, BadgeCheck, ShoppingCart, MessageSquare, ChevronLeft,
  ChevronRight, TrendingUp, Trophy, Medal, Flame,
} from "lucide-react";
import { useApp } from "@/lib/store";
import {
  formatPrice, type CategoryNode, type ProductT,
} from "@/lib/format";
import { toast } from "sonner";

const TIME_RANGES = ["Today", "This week", "This month"] as const;
const COUNTRIES = ["Worldwide", "Ghana", "Côte d'Ivoire", "Nigeria", "China", "India"];

const PAGE_SIZE = 10;

export function RankingView({ categories }: { categories: CategoryNode[] }) {
  const { setView, setProductId, setSupplierId, currency, addToCart } = useApp();
  const [loading, setLoading] = useState(true);
  const [all, setAll] = useState<ProductT[]>([]);
  const [catId, setCatId] = useState<string>("");
  const [range, setRange] = useState<(typeof TIME_RANGES)[number]>("This week");
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const url = `/api/products?take=40&skip=0&orderBy=popular${
          catId ? `&categoryId=${catId}` : ""
        }`;
        const res = await fetch(url);
        const d = await res.json();
        setAll(d.products ?? []);
      } catch {
        setAll([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [catId]);

  // sort client-side by sold desc, with small boost for shorter ranges
  const ranked = useMemo(() => {
    const factor = range === "Today" ? 0.1 : range === "This week" ? 0.35 : 1;
    return [...all]
      .map((p) => ({
        ...p,
        sold: Math.max(1, Math.round(p.sold * factor)),
      }))
      .sort((a, b) => b.sold - a.sold);
  }, [all, range]);

  // optional country filter (cosmetic — show product if matches or worldwide)
  const filtered = useMemo(() => {
    if (country === "Worldwide") return ranked;
    return ranked.filter(
      (p) => (p.country ?? "").toLowerCase() === country.toLowerCase(),
    ).length
      ? ranked.filter(
          (p) => (p.country ?? "").toLowerCase() === country.toLowerCase(),
        )
      : ranked;
  }, [ranked, country]);

  const top3 = filtered.slice(0, 3);
  const rest = filtered.slice(3);
  const totalPages = Math.max(1, Math.ceil(rest.length / PAGE_SIZE));
  const pageItems = rest.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="bg-[#f4f1ec] min-h-[60vh]">
      {/* Hero */}
      <div className="bg-gradient-to-b from-[#2a1c14] to-[#1a130d] text-white">
        <div className="max-w-[1100px] mx-auto px-4 py-10 lg:py-12 text-center">
          <div className="inline-flex items-center gap-2 bg-[#FF6A00] px-3 py-1 text-[11px] uppercase font-bold tracking-wider mb-4">
            <Trophy className="w-3.5 h-3.5" /> Weekly rankings
          </div>
          <h1 className="text-[26px] lg:text-[34px] font-extrabold leading-tight">
            Top Ranking Products
          </h1>
          <p className="text-[#cdbfb5] text-[13px] mt-2 max-w-2xl mx-auto">
            Most popular wholesale products this week, ranked by sales.
            Compare verified suppliers &amp; place your order with confidence.
          </p>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-3 lg:px-6 py-5">
        {/* Filters */}
        <div className="bg-white border border-[#DADAD9] p-3 flex flex-wrap items-center gap-2 mb-4">
          <span className="text-[11px] uppercase font-bold text-[#999] tracking-wide mr-1">
            Filter:
          </span>
          <select
            value={catId}
            onChange={(e) => { setCatId(e.target.value); setPage(1); }}
            className="border border-[#DADAD9] bg-white px-2.5 py-1.5 text-[12px] focus:border-[#FF6A00] outline-none"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <div className="inline-flex border border-[#DADAD9]">
            {TIME_RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-2.5 py-1.5 text-[12px] font-semibold ${
                  range === r
                    ? "bg-[#000] text-white"
                    : "bg-white text-[#555] hover:bg-[#ECECEC]"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="border border-[#DADAD9] bg-white px-2.5 py-1.5 text-[12px] focus:border-[#FF6A00] outline-none ml-auto"
          >
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="bg-white border border-[#DADAD9] h-48 animate-pulse" />
              ))}
            </div>
            <div className="bg-white border border-[#DADAD9] h-12 animate-pulse" />
            <div className="bg-white border border-[#DADAD9] h-12 animate-pulse" />
          </div>
        ) : (
          <>
            {/* ---- TOP 3 spotlight ---- */}
            <div className="benjamin-bar mb-3 flex items-center gap-2">
              <Flame className="w-4 h-4 text-[#FF6A00]" />
              Top 3 this {range.toLowerCase()}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
              {top3.map((p, i) => {
                const rank = i + 1;
                const min = p.priceTiers.length ? p.priceTiers[p.priceTiers.length - 1].price : 0;
                const max = p.priceTiers.length ? p.priceTiers[0].price : 0;
                return (
                  <div
                    key={p.id}
                    className="bg-white border border-[#DADAD9] relative overflow-hidden group"
                  >
                    {/* rank badge */}
                    <div className="absolute top-0 left-0 z-10 bg-[#FF6A00] text-white w-10 h-10 flex items-center justify-center font-extrabold text-[18px]">
                      {rank}
                    </div>
                    {/* trophy icon for #1 */}
                    {rank === 1 && (
                      <div className="absolute top-0 right-0 z-10 bg-[#000] text-white px-2 py-1 text-[10px] uppercase font-bold flex items-center gap-1">
                        <Medal className="w-3 h-3" /> #1
                      </div>
                    )}

                    <button
                      onClick={() => { setProductId(p.id); setView("product"); }}
                      className="block w-full aspect-square bg-[#ECECEC] overflow-hidden"
                    >
                      <img
                        src={p.images[0]}
                        alt={p.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </button>

                    <div className="p-3">
                      <button
                        onClick={() => { setProductId(p.id); setView("product"); }}
                        className="text-[13px] font-semibold text-[#333] hover:text-[#FF6A00] hover:underline line-clamp-2 text-left block min-h-[34px]"
                      >
                        {p.title}
                      </button>

                      <div className="mt-1.5 flex items-end gap-1">
                        <span className="text-[#FF6A00] font-extrabold text-[18px]">
                          {formatPrice(min, currency)}
                        </span>
                        <span className="text-[#999] text-[11px] -mb-0.5">
                          – {formatPrice(max, currency)}
                        </span>
                      </div>

                      <div className="mt-1.5 flex items-center gap-2 text-[11px] text-[#666]">
                        <span className="inline-flex items-center gap-0.5 text-[#16A34A] font-bold">
                          <TrendingUp className="w-3 h-3" />
                          {p.sold.toLocaleString()} sold
                        </span>
                        <span className="text-[#DADAD9]">|</span>
                        <span className="inline-flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-[#FF6A00] text-[#FF6A00]" />
                          {p.rating.toFixed(1)} ({p.reviewCount})
                        </span>
                      </div>

                      <div className="mt-1.5 text-[11px] text-[#666]">
                        by{" "}
                        <button
                          onClick={() => { setSupplierId(p.supplierId); setView("supplier"); }}
                          className="font-semibold text-[#333] hover:text-[#FF6A00] hover:underline inline-flex items-center gap-1"
                        >
                          {p.supplierVerified && (
                            <BadgeCheck className="w-3 h-3 text-[#16A34A]" strokeWidth={2} />
                          )}
                          {p.supplierName}
                        </button>
                      </div>

                      <button
                        onClick={() => { setProductId(p.id); setView("product"); }}
                        className="btn-benjamin-orange w-full mt-3"
                      >
                        View product ›
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ---- Ranked table ---- */}
            <div className="benjamin-bar mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#FF6A00]" />
              Full ranking ({filtered.length} products)
            </div>

            {/* header row */}
            <div className="hidden md:grid bg-[#000] text-white text-[11px] uppercase font-bold tracking-wide grid-cols-[60px_70px_1fr_180px_140px_100px_180px] gap-2 px-4 py-2">
              <span>Rank</span>
              <span>Image</span>
              <span>Product</span>
              <span>Category</span>
              <span>Price range</span>
              <span>Sold</span>
              <span className="text-right">Actions</span>
            </div>

            <div className="bg-white border border-[#DADAD9]">
              {pageItems.length === 0 ? (
                <div className="px-4 py-10 text-center text-[12px] text-[#999] uppercase">
                  No products match these filters
                </div>
              ) : (
                pageItems.map((p, i) => {
                  const rank = 4 + (page - 1) * PAGE_SIZE + i;
                  const min = p.priceTiers.length ? p.priceTiers[p.priceTiers.length - 1].price : 0;
                  const max = p.priceTiers.length ? p.priceTiers[0].price : 0;
                  return (
                    <div
                      key={p.id}
                      className="benjamin-tile border-0 border-b border-[#ECECEC] last:border-b-0 !grid-cols-[60px_70px_1fr_180px_140px_100px_180px] !gap-2 !px-4 !py-3 !grid !items-center"
                    >
                      {/* rank */}
                      <span className="bg-[#FF6A00] text-white w-8 h-8 flex items-center justify-center font-extrabold text-[13px]">
                        {rank}
                      </span>

                      {/* image */}
                      <button
                        onClick={() => { setProductId(p.id); setView("product"); }}
                        className="w-14 h-14 bg-[#ECECEC] overflow-hidden"
                      >
                        <img src={p.images[0]} alt={p.title} loading="lazy" className="w-full h-full object-cover" />
                      </button>

                      {/* title + supplier */}
                      <div className="min-w-0">
                        <button
                          onClick={() => { setProductId(p.id); setView("product"); }}
                          className="text-[13px] font-semibold text-[#333] hover:text-[#FF6A00] hover:underline line-clamp-2 text-left block"
                        >
                          {p.title}
                        </button>
                        <div className="flex items-center gap-1.5 text-[11px] text-[#666] mt-0.5">
                          <Star className="w-3 h-3 fill-[#FF6A00] text-[#FF6A00]" />
                          <span className="font-semibold text-[#333]">{p.rating.toFixed(1)}</span>
                          <span className="text-[#999]">({p.reviewCount})</span>
                          <span className="text-[#DADAD9] mx-0.5">|</span>
                          <button
                            onClick={() => { setSupplierId(p.supplierId); setView("supplier"); }}
                            className="hover:text-[#FF6A00] hover:underline inline-flex items-center gap-0.5"
                          >
                            {p.supplierVerified && (
                              <BadgeCheck className="w-3 h-3 text-[#16A34A]" strokeWidth={2} />
                            )}
                            {p.supplierName}
                          </button>
                        </div>
                      </div>

                      {/* category */}
                      <span className="text-[12px] text-[#555] truncate">
                        {p.categoryName ?? "—"}
                      </span>

                      {/* price */}
                      <div className="text-[12px]">
                        <span className="text-[#FF6A00] font-bold">
                          {formatPrice(min, currency)}
                        </span>
                        <span className="text-[#999]"> – </span>
                        <span className="text-[#FF6A00] font-semibold">
                          {formatPrice(max, currency)}
                        </span>
                      </div>

                      {/* sold */}
                      <span className="text-[12px] text-[#16A34A] font-bold inline-flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {p.sold.toLocaleString()}
                      </span>

                      {/* actions */}
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => {
                            addToCart({
                              productId: p.id,
                              title: p.title,
                              image: p.images[0],
                              price: min,
                              quantity: parseInt(p.minOrder) || 1,
                              unit: p.unit,
                              supplierId: p.supplierId,
                              supplierName: p.supplierName ?? "",
                            });
                            toast.success("Added to cart");
                          }}
                          className="btn-benjamin-orange !py-1.5 !px-2.5 flex items-center gap-1"
                          title="Add to cart"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span className="hidden lg:inline">Add</span>
                        </button>
                        <button
                          onClick={() => {
                            useApp.getState().setChatSupplierId(p.supplierId);
                            useApp.getState().setView("chat");
                          }}
                          className="btn-square-black !py-1.5 !px-2.5 flex items-center gap-1"
                          title="Chat with supplier"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span className="hidden lg:inline">Chat</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-center gap-1.5 mt-5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="benjamin-nav-btn"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`benjamin-nav-btn ${n === page ? "!bg-[#FF6A00] !border-[#FF6A00]" : ""}`}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="benjamin-nav-btn"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
