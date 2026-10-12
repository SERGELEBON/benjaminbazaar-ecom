"use client";

import { useEffect, useState } from "react";
import {
  Package, FileText, Heart, MapPin, User as UserIcon, LogOut, Plus,
  Trash2, Pencil, Star, ChevronRight, Truck, ShieldCheck,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { useApp } from "@/lib/store";
import { formatPrice, type ProductT, type Currency } from "@/lib/format";
import { ProductCard } from "./product-card";

type Tab = "orders" | "rfqs" | "favorites" | "addresses" | "account";

interface Rfq {
  id: string;
  title: string;
  category: string;
  quantity: string;
  unit: string;
  budget: string | null;
  details: string;
  status: string;
  createdAt: string;
  quotes: unknown[];
}

const ORDERS = [
  { ref: "AB-2410-0182", date: "Oct 18, 2025", supplier: "Shenzhen Lumelec Co.", total: 1240, status: "delivered", items: 3 },
  { ref: "AB-2410-0145", date: "Oct 12, 2025", supplier: "Kumasi Textiles Ltd.", total: 540, status: "shipped", items: 1 },
  { ref: "AB-2409-0312", date: "Sep 28, 2025", supplier: "Ivory Coast Cocoa", total: 2890, status: "paid", items: 12 },
  { ref: "AB-2409-0288", date: "Sep 21, 2025", supplier: "Mumbai Garments", total: 880, status: "delivered", items: 2 },
  { ref: "AB-2409-0140", date: "Sep 04, 2025", supplier: "Istanbul Apparel", total: 1620, status: "cancelled", items: 4 },
];

const ADDRESSES = [
  {
    id: "a1",
    label: "Home",
    name: "Kwame Mensah",
    phone: "+233 50 123 4567",
    country: "Ghana",
    city: "Accra",
    line: "12 Liberation Rd, Ridge",
    zip: "GA-001",
    isDefault: true,
  },
  {
    id: "a2",
    label: "Office",
    name: "Kwame Mensah",
    phone: "+233 50 987 6543",
    country: "Ghana",
    city: "Kumasi",
    line: "Adum High Street, Block C",
    zip: "AS-002",
    isDefault: false,
  },
];

export function BuyerDashboard() {
  const { user, signOut, setView, currency, setCurrency, favorites } = useApp();
  const [tab, setTab] = useState<Tab>("orders");

  if (!user) {
    return (
      <div className="bg-[#ECECEC] min-h-screen flex items-center justify-center px-4">
        <div className="bg-white border border-[#DADAD9] max-w-md w-full p-8 text-center">
          <UserIcon className="w-10 h-10 mx-auto text-[#FF6A00]" />
          <h2 className="text-[18px] font-bold mt-3">Sign in to view your dashboard</h2>
          <p className="text-[12px] text-[#666] mt-1.5">
            Track orders, manage RFQs and update your profile.
          </p>
          <button onClick={() => setView("auth")} className="btn-benjamin-orange mt-5 w-full">
            Sign in
          </button>
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: typeof Package }[] = [
    { key: "orders", label: "Orders", icon: Package },
    { key: "rfqs", label: "Inquiries / RFQs", icon: FileText },
    { key: "favorites", label: "Favorites", icon: Heart },
    { key: "addresses", label: "Addresses", icon: MapPin },
    { key: "account", label: "Account", icon: UserIcon },
  ];

  return (
    <div className="bg-[#ECECEC] min-h-screen">
      <Toaster position="top-center" richColors closeButton />

      {/* top bar */}
      <div className="benjamin-bar">Buyer Dashboard</div>

      <div className="max-w-[1280px] mx-auto px-3 lg:px-6 py-5">
        {/* greeting */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-[#666]">Welcome back</div>
            <div className="text-[20px] font-extrabold">Hello, {user.name}</div>
          </div>
          <button
            onClick={() => { signOut(); setView("home"); toast.success("Signed out"); }}
            className="btn-outline-grey flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-5">
          {/* sidebar (vertical on desktop, horizontal scroll on mobile) */}
          <aside className="lg:block">
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
                    <ChevronRight className="w-3.5 h-3.5 lg:block hidden" />
                  </button>
                );
              })}
            </div>
          </aside>

          {/* content */}
          <section className="bg-white border border-[#DADAD9] min-h-[400px]">
            {tab === "orders" && <OrdersTab />}
            {tab === "rfqs" && <RfqsTab />}
            {tab === "favorites" && <FavoritesTab favorites={favorites} />}
            {tab === "addresses" && <AddressesTab />}
            {tab === "account" && <AccountTab currency={currency} setCurrency={setCurrency} />}
          </section>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    delivered: "bg-[#16A34A]",
    shipped: "bg-[#337AB7]",
    paid: "bg-[#FF6A00]",
    pending: "bg-[#999]",
    cancelled: "bg-[#333]",
    open: "bg-[#337AB7]",
    closed: "bg-[#999]",
    paid_out: "bg-[#16A34A]",
    pending_payout: "bg-[#FF6A00]",
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

function OrdersTab() {
  const currency = useApp((s) => s.currency);
  return (
    <div>
      <div className="p-4 border-b border-[#ECECEC] flex items-center justify-between">
        <div>
          <h3 className="benjamin-section-title">My Orders</h3>
          <p className="text-[11px] text-[#888] mt-0.5">5 orders in the last 90 days</p>
        </div>
        <button onClick={() => toast.success("Export started")} className="btn-outline-grey text-[11px]">
          Export
        </button>
      </div>
      {/* desktop table */}
      <div className="hidden md:block">
        <table className="w-full text-[12px]">
          <thead className="bg-[#ECECEC] text-[#666] uppercase text-[10px] tracking-wider">
            <tr>
              <th className="text-left px-4 py-2.5 font-bold">Order ref</th>
              <th className="text-left px-4 py-2.5 font-bold">Date</th>
              <th className="text-left px-4 py-2.5 font-bold">Supplier</th>
              <th className="text-right px-4 py-2.5 font-bold">Items</th>
              <th className="text-right px-4 py-2.5 font-bold">Total</th>
              <th className="text-center px-4 py-2.5 font-bold">Status</th>
              <th className="text-right px-4 py-2.5 font-bold">Action</th>
            </tr>
          </thead>
          <tbody>
            {ORDERS.map((o) => (
              <tr key={o.ref} className="border-b border-[#ECECEC] hover:bg-[#FAFAFA] cursor-pointer"
                onClick={() => toast.info(`Opening order ${o.ref}`)}
              >
                <td className="px-4 py-3 font-semibold text-[#337AB7]">{o.ref}</td>
                <td className="px-4 py-3 text-[#666]">{o.date}</td>
                <td className="px-4 py-3">{o.supplier}</td>
                <td className="px-4 py-3 text-right">{o.items}</td>
                <td className="px-4 py-3 text-right font-bold text-[#FF6A00]">
                  {formatPrice(o.total, currency)}
                </td>
                <td className="px-4 py-3 text-center"><StatusBadge status={o.status} /></td>
                <td className="px-4 py-3 text-right">
                  <button className="benjamin-link text-[12px]">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* mobile cards */}
      <div className="md:hidden divide-y divide-[#ECECEC]">
        {ORDERS.map((o) => (
          <div key={o.ref} className="p-3" onClick={() => toast.info(`Opening order ${o.ref}`)}>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#337AB7]">{o.ref}</span>
              <StatusBadge status={o.status} />
            </div>
            <div className="text-[11px] text-[#888] mt-0.5">{o.date}</div>
            <div className="text-[12px] mt-1">{o.supplier}</div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[11px] text-[#666]">{o.items} items</span>
              <span className="font-bold text-[#FF6A00]">{formatPrice(o.total, currency)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RfqsTab() {
  const { setView } = useApp();
  const [rfqs, setRfqs] = useState<Rfq[] | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await fetch("/api/rfq");
        const d = (await r.json()) as Rfq[];
        if (mounted) setRfqs(d);
      } catch {
        if (mounted) setRfqs([]);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div>
      <div className="p-4 border-b border-[#ECECEC] flex items-center justify-between">
        <div>
          <h3 className="benjamin-section-title">Inquiries / RFQs</h3>
          <p className="text-[11px] text-[#888] mt-0.5">Request quotations from verified suppliers</p>
        </div>
        <button onClick={() => setView("rfq")} className="btn-benjamin-orange text-[11px] flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> New RFQ
        </button>
      </div>

      {rfqs === null ? (
        <div className="p-4 space-y-2">
          {[...Array(3)].map((_, i) => <SkeletonRow key={i} />)}
        </div>
      ) : rfqs.length === 0 ? (
        <div className="p-8 text-center">
          <FileText className="w-10 h-10 mx-auto text-[#DADAD9]" />
          <p className="text-[13px] mt-2 text-[#666]">No RFQs yet.</p>
          <button onClick={() => setView("rfq")} className="btn-benjamin-orange mt-4">Submit your first RFQ</button>
        </div>
      ) : (
        <ul className="divide-y divide-[#ECECEC]">
          {rfqs.map((r) => (
            <li key={r.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3 hover:bg-[#FAFAFA]">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-[13px] truncate">{r.title}</span>
                  <StatusBadge status={r.status} />
                </div>
                <div className="text-[11px] text-[#888] mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                  <span>Category: {r.category}</span>
                  <span>Qty: {r.quantity} {r.unit}</span>
                  {r.budget && <span>Budget: {r.budget}</span>}
                  <span>Created {new Date(r.createdAt).toLocaleDateString()}</span>
                </div>
                {r.details && <p className="text-[12px] text-[#555] mt-1 line-clamp-2">{r.details}</p>}
              </div>
              <div className="text-right md:w-44">
                <div className="text-[11px] text-[#888] uppercase tracking-wide">Quotes</div>
                <div className="text-[22px] font-extrabold text-[#FF6A00]">{r.quotes.length}</div>
                <button onClick={() => toast.info("Viewing quotes")} className="benjamin-link text-[12px]">View quotes →</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FavoritesTab({ favorites }: { favorites: string[] }) {
  const setView = useApp((s) => s.setView);
  const [products, setProducts] = useState<ProductT[] | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const r = await fetch("/api/products?take=24&skip=0");
      const d = await r.json();
      if (mounted) setProducts(d.products as ProductT[]);
    })();
    return () => { mounted = false; };
  }, []);

  const favs = (products || []).filter((p) => favorites.includes(p.id));

  return (
    <div>
      <div className="p-4 border-b border-[#ECECEC]">
        <h3 className="benjamin-section-title">Favorites</h3>
        <p className="text-[11px] text-[#888] mt-0.5">
          {favs.length} product{favs.length === 1 ? "" : "s"} saved
        </p>
      </div>

      {products === null ? (
        <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="aspect-[3/4] bg-[#ECECEC] animate-pulse" />
          ))}
        </div>
      ) : favs.length === 0 ? (
        <div className="p-8 text-center">
          <Heart className="w-10 h-10 mx-auto text-[#DADAD9]" />
          <p className="text-[13px] mt-2 text-[#666]">No favorites yet.</p>
          <p className="text-[11px] text-[#888] mt-1">Tap the heart on any product to save it here.</p>
          <button onClick={() => setView("home")} className="btn-benjamin-orange mt-4">Browse products</button>
        </div>
      ) : (
        <div className="p-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {favs.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}

function AddressesTab() {
  return (
    <div>
      <div className="p-4 border-b border-[#ECECEC] flex items-center justify-between">
        <div>
          <h3 className="benjamin-section-title">Shipping addresses</h3>
          <p className="text-[11px] text-[#888] mt-0.5">Manage delivery destinations</p>
        </div>
        <button onClick={() => toast.info("Opening address form")} className="btn-benjamin-orange text-[11px] flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Add address
        </button>
      </div>
      <ul className="divide-y divide-[#ECECEC]">
        {ADDRESSES.map((a) => (
          <li key={a.id} className="p-4 flex flex-col md:flex-row md:items-start gap-3">
            <div className="w-9 h-9 bg-[#ECECEC] flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 text-[#FF6A00]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-[13px]">{a.label}</span>
                {a.isDefault && (
                  <span className="bg-[#16A34A] text-white text-[10px] font-bold uppercase px-1.5 py-0.5">Default</span>
                )}
              </div>
              <div className="text-[12px] text-[#444] mt-1">{a.name} · {a.phone}</div>
              <div className="text-[12px] text-[#666] mt-0.5">
                {a.line}, {a.city}, {a.country} {a.zip}
              </div>
            </div>
            <div className="flex gap-2 md:flex-col">
              <button onClick={() => toast.info("Edit address")} className="btn-outline-grey text-[11px] flex items-center gap-1">
                <Pencil className="w-3 h-3" /> Edit
              </button>
              <button onClick={() => toast.error("Address removed")} className="btn-outline-grey text-[11px] flex items-center gap-1 hover:!border-[#FF6A00] hover:!text-[#FF6A00]">
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AccountTab({
  currency, setCurrency,
}: {
  currency: Currency;
  setCurrency: (c: Currency) => void;
}) {
  const { user } = useApp();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState("+233 50 123 4567");
  const [country, setCountry] = useState("Ghana");

  return (
    <div className="p-4">
      <h3 className="benjamin-section-title mb-3">Account settings</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wide text-[#666] mb-1">Full name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-[#DADAD9] focus:border-[#FF6A00] px-3 py-2 text-[13px] outline-none" />
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wide text-[#666] mb-1">Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-[#DADAD9] focus:border-[#FF6A00] px-3 py-2 text-[13px] outline-none" />
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wide text-[#666] mb-1">Phone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border border-[#DADAD9] focus:border-[#FF6A00] px-3 py-2 text-[13px] outline-none" />
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wide text-[#666] mb-1">Country</label>
          <select value={country} onChange={(e) => setCountry(e.target.value)} className="w-full border border-[#DADAD9] focus:border-[#FF6A00] px-3 py-2 text-[13px] outline-none bg-white">
            <option>Ghana</option>
            <option>Côte d'Ivoire</option>
            <option>Nigeria</option>
            <option>Kenya</option>
            <option>Other</option>
          </select>
        </div>
      </div>

      <div className="mt-6 border-t border-[#ECECEC] pt-4">
        <div className="benjamin-section-title mb-2">Currency preference</div>
        <div className="flex flex-wrap gap-2">
          {(["GHS", "XOF", "USD"] as Currency[]).map((c) => (
            <button
              key={c}
              onClick={() => { setCurrency(c); toast.success(`Currency set to ${c}`); }}
              className={`px-4 py-2 text-[12px] font-bold border ${
                currency === c
                  ? "bg-[#FF6A00] text-white border-[#FF6A00]"
                  : "bg-white text-[#666] border-[#DADAD9] hover:border-[#FF6A00]"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3 border-t border-[#ECECEC] pt-4">
        <PromoCard icon={<ShieldCheck className="w-5 h-5 text-[#16A34A]" />} title="Trade Assurance" body="Active on all eligible orders" />
        <PromoCard icon={<Star className="w-5 h-5 text-[#FF6A00]" />} title="Buyer level" body="Silver · 18 orders" />
        <PromoCard icon={<Truck className="w-5 h-5 text-[#337AB7]" />} title="Default shipping" body="DHL Express · 3-5 days" />
      </div>

      <div className="mt-6 flex gap-3">
        <button onClick={() => toast.success("Profile saved")} className="btn-benjamin-orange">Save changes</button>
        <button onClick={() => toast.info("No changes")} className="btn-outline-grey">Cancel</button>
      </div>
    </div>
  );
}

function PromoCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="border border-[#DADAD9] p-3 flex items-start gap-3">
      <div className="w-9 h-9 bg-[#ECECEC] flex items-center justify-center shrink-0">{icon}</div>
      <div>
        <div className="text-[11px] uppercase font-bold tracking-wide text-[#666]">{title}</div>
        <div className="text-[12px] mt-0.5">{body}</div>
      </div>
    </div>
  );
}
