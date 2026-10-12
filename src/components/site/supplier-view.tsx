"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Star, BadgeCheck, MessageCircle, MapPin, Building2, Users, DollarSign,
  Globe2, Clock, Truck, RefreshCw, ShieldCheck, FileText, ChevronRight,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { formatPrice, type ProductT, type SupplierT } from "@/lib/format";
import { ProductCard } from "./product-card";
import { toast } from "sonner";

type SupplierFull = SupplierT & { products: ProductT[] };

const TABS = ["Home", "Products", "Company Profile", "Certificates", "Contact"] as const;

function Stars({ n, className = "" }: { n: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i < Math.round(n) ? "fill-[#FF6A00] text-[#FF6A00]" : "text-[#DADAD9]"}`}
          strokeWidth={1.6}
        />
      ))}
    </span>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex-1 min-w-[100px] p-2.5 text-center border-r border-[#ECECEC] last:border-r-0">
      <div className="text-[10px] text-[#888] uppercase tracking-wide">{label}</div>
      <div className={`text-[13px] font-bold ${accent ?? "text-[#333]"}`}>{value}</div>
    </div>
  );
}

function SkeletonSupplier() {
  return (
    <div className="bg-[#f4f1ec] min-h-screen">
      <div className="max-w-[1280px] mx-auto px-3 lg:px-6 py-4">
        <div className="bg-white border border-[#DADAD9] p-5 h-48 bg-[#ECECEC] animate-pulse" />
        <div className="mt-4 h-12 bg-[#ECECEC] animate-pulse" />
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white border border-[#DADAD9]">
              <div className="aspect-square bg-[#ECECEC] animate-pulse" />
              <div className="p-3 space-y-2">
                <div className="h-3 w-full bg-[#ECECEC] animate-pulse" />
                <div className="h-3 w-2/3 bg-[#ECECEC] animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SupplierView() {
  const { supplierId, setSupplierId, setView, setProductId, setChatSupplierId, currency } = useApp();
  const [supplier, setSupplier] = useState<SupplierFull | null>(null);
  const [fallbackId, setFallbackId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Home");

  // If no supplierId, fetch list and pick first
  useEffect(() => {
    if (supplierId) return;
    (async () => {
      try {
        const res = await fetch(`/api/suppliers`);
        const d: SupplierT[] = await res.json();
        if (d.length) {
          const first = d[0];
          setFallbackId(first.id);
        }
      } catch {
        /* ignore */
      }
    })();
  }, [supplierId]);

  const effectiveId = supplierId ?? fallbackId;

  useEffect(() => {
    if (!effectiveId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/suppliers/${effectiveId}`);
        const d = await res.json();
        if (!cancelled) setSupplier(d);
      } catch {
        if (!cancelled) setSupplier(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [effectiveId]);

  const allCats = useMemo(() => {
    if (!supplier) return [] as string[];
    const set = new Set<string>();
    supplier.products.forEach((p) => p.categoryName && set.add(p.categoryName));
    return Array.from(set);
  }, [supplier]);

  if (loading) return <SkeletonSupplier />;
  if (!supplier) {
    return (
      <div className="bg-[#f4f1ec] min-h-screen">
        <div className="max-w-[600px] mx-auto px-4 py-16 text-center">
          <div className="bg-white border border-[#DADAD9] p-10">
            <div className="text-[14px] font-bold mb-2">Supplier not found</div>
            <button onClick={() => setView("manufacturers")} className="btn-benjamin-orange">
              Browse manufacturers
            </button>
          </div>
        </div>
      </div>
    );
  }

  function openProduct(p: ProductT) {
    setProductId(p.id);
    setView("product");
  }

  return (
    <div className="bg-[#f4f1ec] min-h-screen">
      {/* BREADCRUMB */}
      <div className="bg-white border-b border-[#ECECEC]">
        <div className="max-w-[1280px] mx-auto px-3 lg:px-6 py-2 text-[12px] text-[#555]">
          <button onClick={() => setView("home")} className="hover:text-[#FF6A00] hover:underline">
            Home
          </button>
          <span className="mx-1 text-[#DADAD9]">›</span>
          <button
            onClick={() => setView("manufacturers")}
            className="hover:text-[#FF6A00] hover:underline"
          >
            Manufacturers
          </button>
          <span className="mx-1 text-[#DADAD9]">›</span>
          <span className="text-[#333]">{supplier.name}</span>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-3 lg:px-6 py-4">
        {/* BANNER */}
        <div className="bg-white border border-[#DADAD9]">
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-0">
            {/* Logo block */}
            <div className="bg-[#1a1a1a] text-white p-5 flex flex-col items-center justify-center">
              <div className="w-24 h-24 bg-white border-2 border-[#FF6A00] overflow-hidden flex items-center justify-center">
                {supplier.logo ? (
                  <img src={supplier.logo} alt={supplier.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[22px] font-extrabold text-[#FF6A00]">
                    {supplier.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="mt-3 text-[14px] font-bold text-center">{supplier.name}</div>
              <div className="flex items-center gap-1 text-[11px] text-[#9c9c9c] mt-1">
                {supplier.verified && (
                  <BadgeCheck className="w-3.5 h-3.5 text-[#16A34A]" strokeWidth={2} />
                )}
                {supplier.type} · {supplier.years} yrs
              </div>
              <div className="text-[10px] text-[#777] uppercase tracking-wider mt-2">
                ID: {supplier.id.slice(-8).toUpperCase()}
              </div>
            </div>

            {/* Info */}
            <div className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-[20px] font-bold text-[#1a1a1a]">{supplier.name}</h1>
                    {supplier.verified && (
                      <span className="inline-flex items-center gap-1 bg-[#16A34A]/10 text-[#16A34A] text-[11px] font-bold px-2 py-0.5 border border-[#16A34A]/30">
                        <BadgeCheck className="w-3.5 h-3.5" strokeWidth={2} /> Verified
                      </span>
                    )}
                  </div>
                  <div className="text-[12px] text-[#888] flex items-center gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5" /> {supplier.city}, {supplier.country}
                    <span className="mx-1 text-[#DADAD9]">|</span>
                    <Building2 className="w-3.5 h-3.5" /> {supplier.type}
                    <span className="mx-1 text-[#DADAD9]">|</span>
                    <span>📅 {supplier.years} years</span>
                  </div>
                  <div className="text-[12px] text-[#555] mt-1">
                    Main category: <span className="font-bold text-[#333]">{supplier.mainCategory ?? "—"}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      if (supplier?.id) setChatSupplierId(supplier.id);
                      setView("chat");
                    }}
                    className="btn-square-black flex items-center gap-1.5"
                  >
                    <MessageCircle className="w-4 h-4" /> Chat now
                  </button>
                  <button
                    onClick={() => toast.success("Inquiry sent", { description: "Supplier will respond shortly." })}
                    className="btn-benjamin-orange flex items-center gap-1.5"
                  >
                    <FileText className="w-4 h-4" /> Send inquiry
                  </button>
                </div>
              </div>

              {/* Quick facts */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-2 mt-4 border-y border-[#ECECEC] py-2 text-[11px] text-[#666]">
                {supplier.employees && (
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#FF6A00]" />
                    <span><b className="text-[#333]">{supplier.employees}</b> employees</span>
                  </div>
                )}
                {supplier.annualRevenue && (
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-[#FF6A00]" />
                    <span>Revenue: <b className="text-[#333]">{supplier.annualRevenue}</b></span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Globe2 className="w-3.5 h-3.5 text-[#FF6A00]" />
                  <span>Markets: <b className="text-[#333]">{supplier.markets.slice(0, 3).join(", ") || "—"}</b></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#FF6A00]" />
                  <span>Trade Assurance</span>
                </div>
              </div>

              {/* Metrics */}
              <div className="flex flex-wrap mt-3 border border-[#ECECEC]">
                <Metric label="Store rating" value={supplier.storeRating.toFixed(1)} accent="text-[#FF6A00]" />
                <Metric label="Response" value={supplier.responseTime} accent="text-[#337AB7]" />
                <Metric label="On-time dispatch" value={`${supplier.onTimeDispatch}%`} accent="text-[#16A34A]" />
                <Metric label="Reorder rate" value={`${Math.round(supplier.reorderRate)}%`} accent="text-[#FF6A00]" />
                <Metric label="Products" value={String(supplier.productCount ?? supplier.products.length)} />
              </div>

              {/* Certifications */}
              {supplier.certifications.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] uppercase font-bold text-[#888]">Certifications:</span>
                  {supplier.certifications.map((c) => (
                    <span key={c} className="inline-flex items-center gap-1 bg-[#16A34A]/10 text-[#16A34A] text-[10px] font-bold uppercase border border-[#16A34A]/30 px-1.5 py-0.5">
                      <BadgeCheck className="w-3 h-3" /> {c}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="bg-white border border-t-0 border-[#DADAD9]">
          <div className="flex overflow-x-auto benjamin-scroll">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-5 py-3 text-[12px] font-bold uppercase tracking-wide whitespace-nowrap ${
                  tab === t
                    ? "bg-[#000] text-white"
                    : "text-[#666] hover:bg-[#ECECEC] hover:text-[#FF6A00]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* TAB CONTENT */}
        <div className="mt-4">
          {tab === "Home" && (
            <div className="space-y-4">
              {/* Featured products */}
              <div>
                <div className="benjamin-bar mb-3">Featured products</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {supplier.products.slice(0, 8).map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              </div>
              {/* Company snapshot */}
              <div className="bg-white border border-[#DADAD9]">
                <div className="benjamin-bar">Company snapshot</div>
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-[12px]">
                  {[
                    ["Established", `${supplier.years} years ago`],
                    ["Business type", supplier.type],
                    ["Location", `${supplier.city}, ${supplier.country}`],
                    ["Employees", supplier.employees ?? "—"],
                    ["Annual revenue", supplier.annualRevenue ?? "—"],
                    ["Main category", supplier.mainCategory ?? "—"],
                    ["Main markets", supplier.markets.join(", ") || "—"],
                    ["Total products", String(supplier.productCount ?? supplier.products.length)],
                    ["Store rating", `${supplier.storeRating.toFixed(1)} / 5.0`],
                    ["Response time", supplier.responseTime],
                    ["On-time dispatch", `${supplier.onTimeDispatch}%`],
                    ["Reorder rate", `${Math.round(supplier.reorderRate)}%`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex border-b border-[#ECECEC] py-1.5">
                      <div className="w-1/2 text-[#888]">{k}</div>
                      <div className="flex-1 text-[#333] font-semibold">{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "Products" && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="benjamin-section-title">
                  All products ({supplier.productCount ?? supplier.products.length})
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {allCats.map((c) => (
                    <span key={c} className="text-[10px] font-bold uppercase border border-[#DADAD9] text-[#555] px-1.5 py-0.5">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
              {supplier.products.length === 0 ? (
                <div className="bg-white border border-[#DADAD9] p-10 text-center text-[12px] text-[#888]">
                  No products listed yet.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {supplier.products.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "Company Profile" && (
            <div className="space-y-4">
              <div className="bg-white border border-[#DADAD9]">
                <div className="benjamin-bar">Company profile</div>
                <div className="p-5">
                  <p className="text-[13px] text-[#333] leading-relaxed">
                    {supplier.name} is a {supplier.type.toLowerCase()} based in {supplier.city}, {supplier.country},
                    established {supplier.years} years ago. Specializing in {supplier.mainCategory ?? "wholesale goods"},
                    the company serves markets across {supplier.markets.slice(0, 3).join(", ") || "the world"}.
                    With {supplier.employees ?? "a dedicated team"} of employees and annual revenue of {supplier.annualRevenue ?? "—"},
                    {supplier.name} is {supplier.verified ? "a verified supplier" : "an active supplier"} on BENJAMINBAZAAR,
                    maintaining a {supplier.storeRating.toFixed(1)} store rating, {supplier.onTimeDispatch}% on-time dispatch,
                    and {Math.round(supplier.reorderRate)}% reorder rate.
                  </p>

                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-[12px]">
                    {[
                      ["Established", `${new Date().getFullYear() - supplier.years}`],
                      ["Business type", supplier.type],
                      ["Location", `${supplier.city}, ${supplier.country}`],
                      ["Employees", supplier.employees ?? "—"],
                      ["Annual revenue", supplier.annualRevenue ?? "—"],
                      ["Main category", supplier.mainCategory ?? "—"],
                      ["Main markets", supplier.markets.join(", ") || "—"],
                      ["Production capacity", "10,000+ units / month"],
                      ["Nearest port", supplier.country === "China" ? "Shanghai" : supplier.country === "Ghana" ? "Tema" : "—"],
                      ["Accepted delivery terms", "FOB, CIF, EXW, DDP"],
                      ["Accepted payment", "T/T, L/C, PayPal, Escrow"],
                      ["Language spoken", "English, French, Mandarin"],
                    ].map(([k, v]) => (
                      <div key={k} className="flex border-b border-[#ECECEC] py-1.5">
                        <div className="w-1/2 text-[#888]">{k}</div>
                        <div className="flex-1 text-[#333] font-semibold">{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white border border-[#DADAD9]">
                <div className="benjamin-bar">Production capacity & quality</div>
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="benjamin-section-title mb-1.5">Production metrics</div>
                    <ul className="text-[12px] text-[#555] space-y-1.5">
                      <li>🏭 Production lines: 4</li>
                      <li>👥 Annual output: 1.2M units</li>
                      <li>📦 OEM/ODM accepted</li>
                      <li>🏷️ Private label accepted</li>
                      <li>📋 Sampling lead time: 5-7 days</li>
                      <li>🚚 Bulk lead time: 15-30 days</li>
                    </ul>
                  </div>
                  <div>
                    <div className="benjamin-section-title mb-1.5">Quality & compliance</div>
                    <ul className="text-[12px] text-[#555] space-y-1.5">
                      <li>✓ QC team: 12 inspectors</li>
                      <li>✓ In-house lab testing</li>
                      <li>✓ ISO 9001 quality system</li>
                      <li>✓ Pre-shipment inspection</li>
                      <li>✓ Third-party inspection accepted</li>
                      <li>✓ Defect rate &lt; 0.3%</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "Certificates" && (
            <div>
              <div className="benjamin-bar mb-3">Management & product certifications</div>
              {supplier.certifications.length === 0 ? (
                <div className="bg-white border border-[#DADAD9] p-10 text-center text-[12px] text-[#888]">
                  No certifications listed.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {supplier.certifications.map((c) => (
                    <div key={c} className="bg-white border border-[#DADAD9] p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-[#16A34A]/10 border border-[#16A34A]/30 flex items-center justify-center">
                          <BadgeCheck className="w-6 h-6 text-[#16A34A]" />
                        </div>
                        <div>
                          <div className="text-[14px] font-bold text-[#333]">{c}</div>
                          <div className="text-[11px] text-[#888]">Verified · Valid until 2027</div>
                        </div>
                      </div>
                      <div className="text-[11px] text-[#666] mt-3 leading-snug">
                        Issued by an accredited third-party certification body.
                        Demonstrates compliance with international quality standards.
                      </div>
                      <button
                        onClick={() => toast.success("Certificate requested", { description: `${c} certificate will be emailed to you.` })}
                        className="btn-outline-grey w-full mt-3 text-[11px] flex items-center justify-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5" /> Request copy
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "Contact" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Contact details */}
              <div className="bg-white border border-[#DADAD9]">
                <div className="benjamin-bar">Contact details</div>
                <div className="p-5 space-y-3 text-[12px]">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-[#FF6A00] mt-0.5 shrink-0" />
                    <div>
                      <div className="text-[#888] uppercase text-[10px]">Address</div>
                      <div className="text-[#333] font-semibold">
                        {supplier.city} Industrial Zone, {supplier.city}, {supplier.country}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-[#FF6A00] mt-0.5 shrink-0" />
                    <div>
                      <div className="text-[#888] uppercase text-[10px]">Response time</div>
                      <div className="text-[#333] font-semibold">{supplier.responseTime}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Truck className="w-4 h-4 text-[#FF6A00] mt-0.5 shrink-0" />
                    <div>
                      <div className="text-[#888] uppercase text-[10px]">On-time dispatch</div>
                      <div className="text-[#333] font-semibold">{supplier.onTimeDispatch}%</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <RefreshCw className="w-4 h-4 text-[#FF6A00] mt-0.5 shrink-0" />
                    <div>
                      <div className="text-[#888] uppercase text-[10px]">Reorder rate</div>
                      <div className="text-[#333] font-semibold">{Math.round(supplier.reorderRate)}%</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MessageCircle className="w-4 h-4 text-[#FF6A00] mt-0.5 shrink-0" />
                    <div>
                      <div className="text-[#888] uppercase text-[10px]">WhatsApp</div>
                      <div className="text-[#333] font-semibold">+{supplier.country === "China" ? "8613800138000" : "233501234567"}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Inquiry form */}
              <div className="bg-white border border-[#DADAD9]">
                <div className="benjamin-bar-red">Send inquiry</div>
                <form
                  className="p-5 space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    toast.success("Inquiry sent", { description: `${supplier.name} will respond shortly.` });
                  }}
                >
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-[#555] mb-1">Subject</label>
                    <input
                      required
                      className="w-full h-9 border border-[#DADAD9] px-2 text-[12px] outline-none focus:border-[#FF6A00]"
                      defaultValue={`Inquiry about ${supplier.mainCategory ?? "products"}`}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-[#555] mb-1">Quantity</label>
                      <input required type="number" min={1} defaultValue={100} className="w-full h-9 border border-[#DADAD9] px-2 text-[12px] outline-none focus:border-[#FF6A00]" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-[#555] mb-1">Unit</label>
                      <select className="w-full h-9 border border-[#DADAD9] px-2 text-[12px] bg-white outline-none focus:border-[#FF6A00]">
                        <option>pieces</option>
                        <option>cartons</option>
                        <option>kg</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-[#555] mb-1">Details</label>
                    <textarea
                      rows={4}
                      required
                      placeholder="Describe what you need, target price, delivery date, customization…"
                      className="w-full border border-[#DADAD9] px-2 py-1.5 text-[12px] outline-none focus:border-[#FF6A00] resize-none"
                    />
                  </div>
                  <button type="submit" className="btn-benjamin-orange w-full flex items-center justify-center gap-1.5 py-2.5">
                    <FileText className="w-4 h-4" /> Send inquiry
                  </button>
                  <p className="text-[10px] text-[#888] text-center">
                    Your inquiry will be sent via BENJAMINBAZAAR secure messaging. By sending, you agree to our terms.
                  </p>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Suggested suppliers */}
        <div className="mt-8">
          <div className="benjamin-bar mb-3">Other suppliers you may like</div>
          <SuggestedSuppliers currentId={supplier.id} onPick={(id) => { setSupplierId(id); setTab("Home"); }} />
        </div>
      </div>
    </div>
  );
}

function SuggestedSuppliers({ currentId, onPick }: { currentId: string; onPick: (id: string) => void }) {
  const [items, setItems] = useState<SupplierT[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/suppliers`);
        const d: SupplierT[] = await res.json();
        setItems(d.filter((s) => s.id !== currentId).slice(0, 4));
      } catch {
        /* ignore */
      }
    })();
  }, [currentId]);
  if (!items.length) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((s) => (
        <button
          key={s.id}
          onClick={() => onPick(s.id)}
          className="bg-white border border-[#DADAD9] p-4 text-left hover:border-[#FF6A00]"
        >
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#ECECEC] border border-[#DADAD9] flex items-center justify-center text-[12px] font-extrabold text-[#FF6A00]">
              {s.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-[12px] font-bold truncate">{s.name}</span>
                {s.verified && <BadgeCheck className="w-3.5 h-3.5 text-[#16A34A] shrink-0" strokeWidth={2} />}
              </div>
              <div className="text-[11px] text-[#888] truncate">{s.city}, {s.country}</div>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 text-[11px] text-[#666]">
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-[#FF6A00] text-[#FF6A00]" />
              <b className="text-[#333]">{s.storeRating.toFixed(1)}</b>
            </span>
            <span>{s.years} yrs</span>
            <span className="text-[#16A34A] font-bold">{s.onTimeDispatch}%</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#FF6A00]" />
          </div>
        </button>
      ))}
    </div>
  );
}
