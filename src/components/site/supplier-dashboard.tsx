"use client";

import { useEffect, useState } from "react";
import {
  Package, Tags, Boxes, ShoppingCart, FileText, Store, Wallet,
  BadgeCheck, LogOut, Plus, Eye, Upload, ChevronRight, Star,
} from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/lib/store";
import { formatPrice, type ProductT, type Currency } from "@/lib/format";

type Tab =
  | "products" | "tiers" | "stock" | "orders"
  | "quotes" | "store" | "payouts" | "verification";

const SUPPLIER_ORDERS = [
  { ref: "SO-2410-558", buyer: "Accra Trading Co.", date: "Oct 19, 2025", total: 1820, status: "paid" },
  { ref: "SO-2410-541", buyer: "Lagos Imports Ltd.", date: "Oct 16, 2025", total: 940, status: "shipped" },
  { ref: "SO-2410-520", buyer: "Abidjan Distribution", date: "Oct 12, 2025", total: 3520, status: "delivered" },
  { ref: "SO-2410-498", buyer: "Kumasi Retailers", date: "Oct 08, 2025", total: 410, status: "pending" },
  { ref: "SO-2410-475", buyer: "Cape Coast Bazaar", date: "Oct 03, 2025", total: 1180, status: "delivered" },
];

const MOCK_QUOTES = [
  { id: "q1", rfq: "10,000 cotton tote bags", buyer: "Eco Ghana Co.", price: 1.2, moq: "1,000 pcs", leadTime: "12 days", postedAt: "2h ago" },
  { id: "q2", rfq: "500 solar LED lanterns", buyer: "SunPower Africa", price: 18.5, moq: "100 pcs", leadTime: "20 days", postedAt: "5h ago" },
  { id: "q3", rfq: "Custom printed sneakers", buyer: "StreetStep", price: 12.8, moq: "500 pcs", leadTime: "25 days", postedAt: "1d ago" },
];

const MOCK_PAYOUTS = [
  { id: "p1", ref: "PAY-2410-021", date: "Oct 18, 2025", amount: 4200, method: "Bank transfer · Stanbic", status: "paid" },
  { id: "p2", ref: "PAY-2410-014", date: "Oct 10, 2025", amount: 1850, method: "MTN MoMo", status: "paid" },
  { id: "p3", ref: "PAY-2410-007", date: "Oct 01, 2025", amount: 2870, method: "Bank transfer · Stanbic", status: "pending" },
  { id: "p4", ref: "PAY-2409-099", date: "Sep 26, 2025", amount: 540, method: "Bank transfer · Stanbic", status: "paid" },
];

export function SupplierDashboard() {
  const { user, signOut, setView, currency } = useApp();
  const [tab, setTab] = useState<Tab>("products");
  const [productCount, setProductCount] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await fetch("/api/products?take=1&skip=0");
        const d = await r.json();
        if (mounted) setProductCount(d.total ?? 0);
      } catch {
        if (mounted) setProductCount(0);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (!user) return null; // guarded by <RequireAuth>


  const tabs: { key: Tab; label: string; icon: typeof Package }[] = [
    { key: "products", label: "Products", icon: Package },
    { key: "tiers", label: "Prices & Tiers", icon: Tags },
    { key: "stock", label: "Stock", icon: Boxes },
    { key: "orders", label: "Orders", icon: ShoppingCart },
    { key: "quotes", label: "Quotes", icon: FileText },
    { key: "store", label: "Store Design", icon: Store },
    { key: "payouts", label: "Payouts", icon: Wallet },
    { key: "verification", label: "Verification", icon: BadgeCheck },
  ];

  const KPI = [
    { label: "Products", value: productCount === null ? "…" : productCount.toString() },
    { label: "Orders", value: "128" },
    { label: "Revenue", value: formatPrice(45200, currency) },
    { label: "Payouts due", value: formatPrice(8200, currency) },
  ];

  return (
    <div className="bg-[#ECECEC] min-h-screen">

      <div className="benjamin-bar">Supplier Dashboard</div>

      <div className="max-w-[1280px] mx-auto px-3 lg:px-6 py-5">
        {/* greeting */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-[#666]">Supplier portal</div>
            <div className="text-[20px] font-extrabold">Bonjour, {user.name ?? user.email}</div>
            {user.supplier && <div className="text-[12px] text-[#666]">{user.supplier.name}</div>}
          </div>
          <button
            onClick={async () => { await signOut(); toast.success("Vous êtes déconnecté."); }}
            className="btn-outline-grey flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {KPI.map((k) => (
            <div key={k.label} className="bg-white border border-[#DADAD9] p-4">
              <div className="text-[22px] lg:text-[26px] font-extrabold text-[#FF6A00] leading-none">
                {k.value}
              </div>
              <div className="text-[11px] uppercase tracking-wide text-[#666] font-bold mt-2">
                {k.label}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-5">
          {/* sidebar */}
          <aside>
            <div className="flex lg:flex-col gap-0 overflow-x-auto benjamin-scroll -mx-3 px-3 lg:mx-0 lg:px-0">
              {tabs.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`benjamin-tile whitespace-nowrap shrink-0 lg:w-full ${tab === t.key ? "active" : ""}`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="flex-1 text-left">{t.label}</span>
                    <ChevronRight className="w-3.5 h-3.5 hidden lg:block" />
                  </button>
                );
              })}
            </div>
          </aside>

          {/* content */}
          <section className="bg-white border border-[#DADAD9] min-h-[400px]">
            {tab === "products" && <ProductsTab />}
            {tab === "tiers" && <TiersTab />}
            {tab === "stock" && <StockTab />}
            {tab === "orders" && <OrdersTab />}
            {tab === "quotes" && <QuotesTab />}
            {tab === "store" && <StoreTab />}
            {tab === "payouts" && <PayoutsTab />}
            {tab === "verification" && <VerificationTab />}
          </section>
        </div>
      </div>
    </div>
  );
}

function Badge({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid: "bg-[#16A34A]",
    shipped: "bg-[#337AB7]",
    delivered: "bg-[#16A34A]",
    pending: "bg-[#999]",
    cancelled: "bg-[#333]",
    open: "bg-[#337AB7]",
    active: "bg-[#16A34A]",
    paused: "bg-[#999]",
  };
  return (
    <span className={`${map[status] || "bg-[#999]"} text-white text-[10px] font-bold uppercase px-2 py-0.5 tracking-wide`}>
      {status}
    </span>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 p-3 border-b border-[#ECECEC]">
      <div className="w-10 h-10 bg-[#ECECEC] animate-pulse" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 bg-[#ECECEC] animate-pulse w-1/2" />
        <div className="h-2.5 bg-[#ECECEC] animate-pulse w-1/3" />
      </div>
    </div>
  );
}

function ProductsTab() {
  const currency = useApp((s) => s.currency);
  const [products, setProducts] = useState<ProductT[] | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const r = await fetch("/api/products?take=12&skip=0");
      const d = await r.json();
      if (mounted) setProducts(d.products as ProductT[]);
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div>
      <div className="p-4 border-b border-[#ECECEC] flex items-center justify-between gap-3">
        <div>
          <h3 className="benjamin-section-title">My Products</h3>
          <p className="text-[11px] text-[#888] mt-0.5">{products?.length ?? "—"} of your listings</p>
        </div>
        <button onClick={() => toast.success("Opening product form")} className="btn-benjamin-orange text-[11px] flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Add product
        </button>
      </div>

      {products === null ? (
        <div className="p-4 space-y-2">{[...Array(6)].map((_, i) => <SkeletonRow key={i} />)}</div>
      ) : (
        <>
          {/* desktop */}
          <div className="hidden md:block overflow-x-auto benjamin-scroll">
            <table className="w-full text-[12px] min-w-[680px]">
              <thead className="bg-[#ECECEC] text-[#666] uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="text-left px-4 py-2.5 font-bold">Product</th>
                  <th className="text-left px-4 py-2.5 font-bold">Price tier 0</th>
                  <th className="text-right px-4 py-2.5 font-bold">Stock</th>
                  <th className="text-center px-4 py-2.5 font-bold">Status</th>
                  <th className="text-right px-4 py-2.5 font-bold">Action</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p, i) => (
                  <ProductRow key={p.id} product={p} currency={currency} stock={[420, 80, 12, 240, 0, 60, 380, 18, 95, 410, 22, 75][i % 12]} />
                ))}
              </tbody>
            </table>
          </div>
          {/* mobile */}
          <ul className="md:hidden divide-y divide-[#ECECEC]">
            {products.map((p, i) => (
              <li key={p.id} className="p-3 flex gap-3">
                <img src={p.images[0]} alt={p.title} className="w-14 h-14 object-cover border border-[#ECECEC]" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[13px] truncate">{p.title}</div>
                  <div className="text-[11px] text-[#FF6A00] font-bold">
                    {formatPrice(p.priceTiers[0]?.price ?? 0, currency)}
                  </div>
                  <div className="text-[10px] text-[#888] mt-0.5">
                    Stock {[420, 80, 12, 240, 0, 60, 380, 18, 95, 410, 22, 75][i % 12]} · {p.sold} sold
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function ProductRow({ product, currency, stock }: { product: ProductT; currency: Currency; stock: number }) {
  const [active, setActive] = useState(true);
  return (
    <tr className="border-b border-[#ECECEC] hover:bg-[#FAFAFA]">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <img src={product.images[0]} alt={product.title} className="w-10 h-10 object-cover border border-[#ECECEC]" />
          <div className="min-w-0">
            <div className="font-semibold text-[12px] truncate max-w-[260px]">{product.title}</div>
            <div className="text-[10px] text-[#888]">{product.supplierName} · {product.country}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 font-bold text-[#FF6A00]">
        {formatPrice(product.priceTiers[0]?.price ?? 0, currency)}
      </td>
      <td className="px-4 py-3 text-right">
        <span className={stock === 0 ? "text-[#FF6A00] font-bold" : stock < 50 ? "text-[#FF6A00] font-semibold" : ""}>
          {stock.toLocaleString()}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        <button
          onClick={() => { setActive(!active); toast.success(`Product ${active ? "paused" : "activated"}`); }}
          className="inline-flex items-center gap-1.5"
        >
          <Badge status={active ? "active" : "paused"} />
        </button>
      </td>
      <td className="px-4 py-3 text-right">
        <button onClick={() => toast.info("Edit product")} className="benjamin-link text-[12px]">Edit</button>
      </td>
    </tr>
  );
}

function TiersTab() {
  const currency = useApp((s) => s.currency);
  const [product, setProduct] = useState<ProductT | null>(null);
  const [tiers, setTiers] = useState([
    { minQty: 1, maxQty: 49, price: 0 },
    { minQty: 50, maxQty: 499, price: 0 },
    { minQty: 500, maxQty: null as number | null, price: 0 },
  ]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const r = await fetch("/api/products?take=1&skip=0");
      const d = await r.json();
      const p = (d.products as ProductT[])[0];
      if (mounted && p) {
        setProduct(p);
        setTiers([
          { minQty: p.priceTiers[0]?.minQty ?? 1, maxQty: p.priceTiers[0]?.maxQty ?? 49, price: p.priceTiers[0]?.price ?? 0 },
          { minQty: p.priceTiers[1]?.minQty ?? 50, maxQty: p.priceTiers[1]?.maxQty ?? 499, price: p.priceTiers[1]?.price ?? 0 },
          { minQty: p.priceTiers[2]?.minQty ?? 500, maxQty: p.priceTiers[2]?.maxQty ?? null, price: p.priceTiers[2]?.price ?? 0 },
        ]);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (!product) {
    return <div className="p-4 space-y-2">{[...Array(3)].map((_, i) => <SkeletonRow key={i} />)}</div>;
  }

  return (
    <div>
      <div className="p-4 border-b border-[#ECECEC]">
        <h3 className="benjamin-section-title">Price Tiers</h3>
        <p className="text-[11px] text-[#888] mt-0.5">
          Editing tiers for: <span className="font-semibold text-[#333]">{product.title}</span>
        </p>
      </div>
      <div className="p-4">
        <div className="hidden md:grid grid-cols-[1fr_1fr_2fr_120px] gap-3 text-[10px] uppercase tracking-wider text-[#666] font-bold mb-2">
          <div>Min qty</div>
          <div>Max qty</div>
          <div>Unit price (GHS)</div>
          <div className="text-right">Preview</div>
        </div>
        <div className="space-y-3">
          {tiers.map((t, i) => (
            <div key={i} className="grid grid-cols-2 md:grid-cols-[1fr_1fr_2fr_120px] gap-3 items-center border border-[#ECECEC] p-3">
              <div>
                <label className="md:hidden block text-[10px] uppercase text-[#666] mb-1">Min qty</label>
                <input
                  type="number"
                  value={t.minQty}
                  onChange={(e) => {
                    const v = parseInt(e.target.value || "0", 10);
                    setTiers((s) => s.map((row, j) => j === i ? { ...row, minQty: v } : row));
                  }}
                  className="w-full border border-[#DADAD9] px-3 py-2 text-[13px] outline-none focus:border-[#FF6A00]"
                />
              </div>
              <div>
                <label className="md:hidden block text-[10px] uppercase text-[#666] mb-1">Max qty</label>
                <input
                  type="number"
                  value={t.maxQty ?? ""}
                  placeholder="∞"
                  onChange={(e) => {
                    const v = e.target.value === "" ? null : parseInt(e.target.value, 10);
                    setTiers((s) => s.map((row, j) => j === i ? { ...row, maxQty: v } : row));
                  }}
                  className="w-full border border-[#DADAD9] px-3 py-2 text-[13px] outline-none focus:border-[#FF6A00]"
                />
              </div>
              <div>
                <label className="md:hidden block text-[10px] uppercase text-[#666] mb-1">Unit price (GHS)</label>
                <input
                  type="number"
                  step="0.01"
                  value={t.price}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value || "0");
                    setTiers((s) => s.map((row, j) => j === i ? { ...row, price: v } : row));
                  }}
                  className="w-full border border-[#DADAD9] px-3 py-2 text-[13px] outline-none focus:border-[#FF6A00]"
                />
              </div>
              <div className="text-right text-[#FF6A00] font-extrabold text-[14px]">
                {formatPrice(t.price, currency)}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-3">
          <button onClick={() => toast.success("Tiers saved")} className="btn-benjamin-orange">Save tiers</button>
          <button onClick={() => toast.info("Reverted")} className="btn-outline-grey">Revert</button>
        </div>
      </div>
    </div>
  );
}

function StockTab() {
  const currency = useApp((s) => s.currency);
  const [products, setProducts] = useState<ProductT[] | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const r = await fetch("/api/products?take=12&skip=0");
      const d = await r.json();
      if (mounted) setProducts(d.products as ProductT[]);
    })();
    return () => { mounted = false; };
  }, []);

  const stocks = [420, 80, 12, 240, 0, 60, 380, 18, 95, 410, 22, 75];

  if (!products) {
    return <div className="p-4 space-y-2">{[...Array(6)].map((_, i) => <SkeletonRow key={i} />)}</div>;
  }

  return (
    <div>
      <div className="p-4 border-b border-[#ECECEC]">
        <h3 className="benjamin-section-title">Stock Levels</h3>
        <p className="text-[11px] text-[#888] mt-0.5">Inventory across all SKUs · refreshes every 5 min</p>
      </div>
      <div className="overflow-x-auto benjamin-scroll">
        <table className="w-full text-[12px] min-w-[680px]">
          <thead className="bg-[#ECECEC] text-[#666] uppercase text-[10px] tracking-wider">
            <tr>
              <th className="text-left px-4 py-2.5 font-bold">SKU / Product</th>
              <th className="text-right px-4 py-2.5 font-bold">In stock</th>
              <th className="text-right px-4 py-2.5 font-bold">Reserved</th>
              <th className="text-right px-4 py-2.5 font-bold">Available</th>
              <th className="text-right px-4 py-2.5 font-bold">Unit cost</th>
              <th className="text-center px-4 py-2.5 font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p, i) => {
              const stock = stocks[i % 12];
              const reserved = Math.floor(stock * 0.12);
              const avail = Math.max(0, stock - reserved);
              return (
                <tr key={p.id} className="border-b border-[#ECECEC] hover:bg-[#FAFAFA]">
                  <td className="px-4 py-3">
                    <div className="font-semibold truncate max-w-[260px]">{p.title}</div>
                    <div className="text-[10px] text-[#888]">SKU-{p.id.slice(-6).toUpperCase()}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{stock.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-[#888]">{reserved.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-bold">{avail.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">{formatPrice((p.priceTiers[0]?.price ?? 0) * 0.6, currency)}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge status={stock === 0 ? "paused" : stock < 50 ? "pending" : "active"} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OrdersTab() {
  const currency = useApp((s) => s.currency);
  return (
    <div>
      <div className="p-4 border-b border-[#ECECEC]">
        <h3 className="benjamin-section-title">Incoming Orders</h3>
        <p className="text-[11px] text-[#888] mt-0.5">{SUPPLIER_ORDERS.length} orders in the last 30 days</p>
      </div>
      <div className="overflow-x-auto benjamin-scroll">
        <table className="w-full text-[12px] min-w-[640px]">
          <thead className="bg-[#ECECEC] text-[#666] uppercase text-[10px] tracking-wider">
            <tr>
              <th className="text-left px-4 py-2.5 font-bold">Order ref</th>
              <th className="text-left px-4 py-2.5 font-bold">Buyer</th>
              <th className="text-left px-4 py-2.5 font-bold">Date</th>
              <th className="text-right px-4 py-2.5 font-bold">Total</th>
              <th className="text-center px-4 py-2.5 font-bold">Status</th>
              <th className="text-right px-4 py-2.5 font-bold">Action</th>
            </tr>
          </thead>
          <tbody>
            {SUPPLIER_ORDERS.map((o) => (
              <tr key={o.ref} className="border-b border-[#ECECEC] hover:bg-[#FAFAFA]">
                <td className="px-4 py-3 font-semibold text-[#337AB7]">{o.ref}</td>
                <td className="px-4 py-3">{o.buyer}</td>
                <td className="px-4 py-3 text-[#666]">{o.date}</td>
                <td className="px-4 py-3 text-right font-bold text-[#FF6A00]">{formatPrice(o.total, currency)}</td>
                <td className="px-4 py-3 text-center"><Badge status={o.status} /></td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => toast.info(`Opening ${o.ref}`)} className="benjamin-link text-[12px]">Fulfill</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function QuotesTab() {
  const currency = useApp((s) => s.currency);
  return (
    <div>
      <div className="p-4 border-b border-[#ECECEC] flex items-center justify-between">
        <div>
          <h3 className="benjamin-section-title">RFQ Quotes to Respond</h3>
          <p className="text-[11px] text-[#888] mt-0.5">{MOCK_QUOTES.length} open inquiries</p>
        </div>
        <button onClick={() => toast.info("Opening quote form")} className="btn-outline-grey text-[11px]">View all</button>
      </div>
      <ul className="divide-y divide-[#ECECEC]">
        {MOCK_QUOTES.map((q) => (
          <li key={q.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-bold text-[13px] truncate">{q.rfq}</div>
              <div className="text-[11px] text-[#888] mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                <span>Buyer: {q.buyer}</span>
                <span>MOQ: {q.moq}</span>
                <span>Lead time: {q.leadTime}</span>
                <span>Posted {q.postedAt}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wide text-[#888]">Suggested price</div>
                <div className="font-extrabold text-[#FF6A00] text-[15px]">{formatPrice(q.price, currency)}</div>
              </div>
              <button onClick={() => toast.success("Quote sent")} className="btn-benjamin-orange text-[11px]">Send quote</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StoreTab() {
  const [desc, setDesc] = useState(
    "Manufacturer of premium textiles & apparel since 2014. ISO 9001 certified. Trusted by 1,200+ buyers across West Africa.",
  );
  const [name, setName] = useState("Shenzhen Lumelec Co.");
  return (
    <div>
      <div className="p-4 border-b border-[#ECECEC]">
        <h3 className="benjamin-section-title">Store Design</h3>
        <p className="text-[11px] text-[#888] mt-0.5">Customize your supplier storefront</p>
      </div>
      <div className="p-4 space-y-5">
        {/* banner */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wide text-[#666] mb-2">Store banner</label>
          <div className="relative border border-[#DADAD9] aspect-[3/1] max-w-md bg-[#ECECEC] overflow-hidden">
            <img src="https://picsum.photos/seed/benjamin-store-banner/900/300" alt="banner" className="w-full h-full object-cover" />
            <button
              onClick={() => toast.info("Opening media library")}
              className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-[12px] uppercase font-bold tracking-wider opacity-0 hover:opacity-100 transition"
            >
              <Upload className="w-4 h-4 mr-2" /> Replace banner
            </button>
          </div>
        </div>
        {/* logo */}
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-[#ECECEC] border border-[#DADAD9] flex items-center justify-center">
            <Store className="w-7 h-7 text-[#888]" />
          </div>
          <div>
            <button onClick={() => toast.info("Opening media library")} className="btn-outline-grey text-[11px] flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5" /> Upload logo
            </button>
            <p className="text-[10px] text-[#888] mt-1.5">Square · PNG · max 1MB</p>
          </div>
        </div>
        {/* name */}
        <div className="max-w-md">
          <label className="block text-[11px] font-bold uppercase tracking-wide text-[#666] mb-1">Store name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-[#DADAD9] px-3 py-2 text-[13px] outline-none focus:border-[#FF6A00]" />
        </div>
        {/* desc */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wide text-[#666] mb-1">Store description</label>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={4}
            className="w-full border border-[#DADAD9] px-3 py-2 text-[13px] outline-none focus:border-[#FF6A00] resize-none"
          />
        </div>
        <div className="flex gap-3">
          <button onClick={() => toast.success("Store saved")} className="btn-benjamin-orange">Save changes</button>
          <button onClick={() => toast.info("Preview opened")} className="btn-outline-grey flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" /> Preview store
          </button>
        </div>
      </div>
    </div>
  );
}

function PayoutsTab() {
  const currency = useApp((s) => s.currency);
  const totalDue = MOCK_PAYOUTS.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0);
  return (
    <div>
      <div className="p-4 border-b border-[#ECECEC] flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="benjamin-section-title">Payouts</h3>
          <p className="text-[11px] text-[#888] mt-0.5">
            Available balance: <span className="font-bold text-[#FF6A00]">{formatPrice(totalDue, currency)}</span>
          </p>
        </div>
        <button onClick={() => toast.success("Payout requested")} className="btn-benjamin-orange text-[11px]">Request payout</button>
      </div>
      <div className="overflow-x-auto benjamin-scroll">
        <table className="w-full text-[12px] min-w-[640px]">
          <thead className="bg-[#ECECEC] text-[#666] uppercase text-[10px] tracking-wider">
            <tr>
              <th className="text-left px-4 py-2.5 font-bold">Reference</th>
              <th className="text-left px-4 py-2.5 font-bold">Date</th>
              <th className="text-left px-4 py-2.5 font-bold">Method</th>
              <th className="text-right px-4 py-2.5 font-bold">Amount</th>
              <th className="text-center px-4 py-2.5 font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_PAYOUTS.map((p) => (
              <tr key={p.id} className="border-b border-[#ECECEC] hover:bg-[#FAFAFA]">
                <td className="px-4 py-3 font-semibold text-[#337AB7]">{p.ref}</td>
                <td className="px-4 py-3 text-[#666]">{p.date}</td>
                <td className="px-4 py-3">{p.method}</td>
                <td className="px-4 py-3 text-right font-bold text-[#FF6A00]">{formatPrice(p.amount, currency)}</td>
                <td className="px-4 py-3 text-center"><Badge status={p.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function VerificationTab() {
  const items = [
    { label: "Company verified", status: "verified", hint: "Business registration matched" },
    { label: "Bank account verified", status: "verified", hint: "Stanbic · •••4521" },
    { label: "Trade license", status: "pending", hint: "Awaiting upload" },
    { label: "Tax identification (TIN)", status: "verified", hint: "GHA-29481-X" },
    { label: "ISO 9001 certificate", status: "pending", hint: "Expires in 60 days — renew" },
    { label: "Factory audit", status: "missing", hint: "Not started" },
  ];
  return (
    <div>
      <div className="p-4 border-b border-[#ECECEC]">
        <h3 className="benjamin-section-title">Verification Checklist</h3>
        <p className="text-[11px] text-[#888] mt-0.5">
          Verified suppliers earn 3.4× more inquiries. Complete your verification.
        </p>
      </div>
      <ul className="divide-y divide-[#ECECEC]">
        {items.map((it) => (
          <li key={it.label} className="p-4 flex items-start gap-3">
            <div className="w-8 h-8 flex items-center justify-center shrink-0">
              {it.status === "verified" ? (
                <BadgeCheck className="w-6 h-6 text-[#16A34A]" />
              ) : it.status === "pending" ? (
                <span className="w-5 h-5 border-2 border-[#FF6A00] flex items-center justify-center text-[#FF6A00] text-[12px] font-bold">!</span>
              ) : (
                <span className="w-5 h-5 border-2 border-[#999] flex items-center justify-center text-[#999] text-[12px]">·</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[13px]">{it.label}</div>
              <div className="text-[11px] text-[#888] mt-0.5">{it.hint}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] uppercase font-bold tracking-wide ${
                it.status === "verified" ? "text-[#16A34A]" : it.status === "pending" ? "text-[#FF6A00]" : "text-[#999]"
              }`}>
                {it.status}
              </span>
              {it.status !== "verified" && (
                <button
                  onClick={() => toast.success("Documents submitted")}
                  className="btn-outline-grey text-[11px]"
                >
                  Submit
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      <div className="p-4 border-t border-[#ECECEC] flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-[#16A34A] text-[12px] font-bold">
          <Star className="w-3.5 h-3.5 fill-[#16A34A]" /> 4 of 6 verifications complete
        </div>
        <button onClick={() => toast.success("Submitted for review")} className="btn-benjamin-orange ml-auto">
          Submit documents
        </button>
      </div>
    </div>
  );
}
