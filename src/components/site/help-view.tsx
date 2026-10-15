"use client";

import { useState } from "react";
import {
  Search, ChevronRight, MessageCircle, Mail, Bot, ShieldCheck,
  Rocket, Truck, CreditCard, ShieldAlert, UserCircle, FileText,
  Boxes, Phone,
} from "lucide-react";
import { toast } from "sonner";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { useApp } from "@/lib/store";
import { BRAND, brandEmail } from "@/lib/brand";

const CATEGORY_TILES = [
  { key: "start", label: "Getting started", icon: Rocket, body: "Place your first order in minutes" },
  { key: "orders", label: "Orders & shipping", icon: Truck, body: "Track, dispatch, delivery windows" },
  { key: "payments", label: "Payments", icon: CreditCard, body: "MoMo, bank transfer, escrow" },
  { key: "ta", label: "Trade Assurance", icon: ShieldCheck, body: "Order protection & refunds" },
  { key: "disputes", label: "Disputes", icon: ShieldAlert, body: "Resolve a conflict" },
  { key: "account", label: "Account", icon: UserCircle, body: "Profile, password, settings" },
  { key: "rfq", label: "RFQ", icon: FileText, body: "Request quotations like a pro" },
  { key: "drop", label: "Dropshipping", icon: Boxes, body: "Sell without inventory" },
];

const FAQS = [
  {
    q: "How do I place my first wholesale order?",
    a: "Search for a product, set your quantity above the MOQ (minimum order quantity), then click Add to cart or Buy now. You can pay via MTN MoMo, bank transfer, or Trade Assurance escrow. Verified suppliers dispatch within their stated lead time.",
  },
  {
    q: "What is Trade Assurance and how does it protect me?",
    a: `Trade Assurance is ${BRAND.name}'s free order protection. Your payment is held in escrow and only released to the supplier once you confirm receipt. It covers on-time dispatch, product quality, and order accuracy. Claims are resolved within 7 days.`,
  },
  {
    q: "How long does shipping take to Ghana?",
    a: "Express courier (DHL/FedEx) reaches Accra in 3-5 business days. Standard air freight is 7-12 days. Sea freight via Tema port takes 25-35 days. Lead times are displayed on each product page alongside the supplier's response time.",
  },
  {
    q: "Which payment methods are supported?",
    a: "Buyers in Ghana and Côte d'Ivoire can pay with MTN MoMo, Vodafone Cash, Orange Money, or bank transfer (GHS / XOF). International buyers can use Visa, Mastercard, or USD bank transfer. All eligible orders are covered by Trade Assurance.",
  },
  {
    q: "Can I negotiate bulk pricing?",
    a: "Yes. Click Send inquiry or open an RFQ (Request for Quotation) describing your quantity, target price, and customization needs. Verified suppliers typically respond within 2 hours and provide 3-tier pricing for higher volumes.",
  },
  {
    q: "What is an RFQ and when should I use one?",
    a: "An RFQ lets multiple suppliers compete for your order. Use it when you need custom products, quantities above 500 units, or haven't found the exact match in search. Most RFQs receive 3-8 quotes within 24 hours.",
  },
  {
    q: "How do returns and refunds work?",
    a: "If an item doesn't match the listing, file a dispute within 15 days of delivery. Trade Assurance covers full refunds for quality issues, missing items, or late dispatch. Resolved refunds are paid out to your original payment method in 5-10 business days.",
  },
  {
    q: "Are suppliers verified?",
    a: "All suppliers with a green Verified badge have passed business registration, bank account, and trade license checks. Factory-audited suppliers carry an additional ISO badge. You can request a fresh audit report from any supplier's storefront.",
  },
  {
    q: `Can I dropship from ${BRAND.name}?`,
    a: "Yes. Switch on Dropshipping mode in your account settings and suppliers will hide their branding from shipments. You can also automate order routing via our API for Shopify, WooCommerce, or TikTok Shop integrations.",
  },
  {
    q: "How are currency conversions handled?",
    a: "All prices are stored in GHS (Ghana Cedi). You can switch the display currency to GHS, XOF (West African CFA franc), or USD from the toolbar. Conversions use daily mid-market rates updated every hour.",
  },
];

export function HelpView() {
  const { setView } = useApp();
  const [q, setQ] = useState("");

  return (
    <div className="bg-[#ECECEC] min-h-screen">

      <div className="benjamin-bar">Help Center</div>

      <div className="bg-brand-gradient text-white">
        <div className="max-w-[900px] mx-auto px-4 py-10 text-center">
          <h1 className="text-[26px] lg:text-[34px] font-extrabold leading-tight">
            How can we help?
          </h1>
          <p className="text-[#CFD6F5] text-[13px] mt-2 max-w-xl mx-auto">
            Search articles, browse categories, or chat with our team 24/7.
          </p>
          <div className="mt-5 max-w-xl mx-auto flex items-center bg-white h-12 border-2 border-[#FF6A00]">
            <Search className="w-5 h-5 text-[#999] ml-3" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && toast.info(`Searching "${q || "…"}"`)}
              placeholder="Search help articles…"
              className="flex-1 h-full px-3 text-[13px] text-[#333] outline-none bg-transparent placeholder:text-[#999]"
            />
            <button
              onClick={() => toast.info(`Searching "${q || "…"}"`)}
              className="bg-[#FF6A00] text-white px-5 h-full font-bold uppercase tracking-wider hover:bg-[#E55A00] flex items-center gap-2"
            >
              <Search className="w-4 h-4" /> Search
            </button>
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-2 text-[11px]">
            {["Trade Assurance", "Shipping to Ghana", "Refunds", "RFQ"].map((s) => (
              <button
                key={s}
                onClick={() => { setQ(s); toast.info(`Searching "${s}"`); }}
                className="bg-white/10 hover:bg-[#FF6A00] px-2.5 py-1 border border-white/20"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-3 lg:px-6 py-8 space-y-8">
        {/* CATEGORY TILES */}
        <section>
          <div className="benjamin-section-title mb-3">Browse by category</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {CATEGORY_TILES.map((c) => {
              const Icon = c.icon;
              return (
                <button
                  key={c.key}
                  onClick={() => toast.info(`Opening: ${c.label}`)}
                  className="benjamin-tile flex-col items-start !p-4 text-left"
                >
                  <div className="flex items-center gap-2 w-full">
                    <Icon className="w-4 h-4 text-[#FF6A00] shrink-0" />
                    <span className="font-bold text-[13px] flex-1">{c.label}</span>
                    <ChevronRight className="w-3.5 h-3.5 benjamin-tile-arrow" />
                  </div>
                  <span className="text-[11px] mt-1 text-[#666] group-hover:text-white/80">{c.body}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* FAQ */}
        <section className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
          <div className="bg-white border border-[#DADAD9]">
            <div className="benjamin-bar">Frequently asked questions</div>
            <Accordion type="single" collapsible className="px-4">
              {FAQS.map((f, i) => (
                <AccordionItem key={i} value={`item-${i}`} className="border-b border-[#ECECEC]">
                  <AccordionTrigger className="text-[13px] font-semibold hover:text-[#FF6A00] hover:no-underline">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-[12px] text-[#555] leading-relaxed">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {/* AI ASSISTANT PROMO */}
          <aside className="space-y-5">
            <div className="bg-[#0A0F4D] text-white">
              <div className="benjamin-bar-red">AI Assistant</div>
              <div className="p-5">
                <div className="w-12 h-12 bg-[#FF6A00] flex items-center justify-center mb-3">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-[18px] font-extrabold leading-tight">
                  Get instant answers
                </h3>
                <p className="text-[12px] text-[#CFD6F5] mt-2 leading-relaxed">
                  Draft RFQs, compare quotes, translate specs and resolve disputes —
                  all with the {BRAND.shortName} AI Assistant. Available 24/7.
                </p>
                <button
                  onClick={() => toast.success("AI Assistant opening…")}
                  className="btn-benjamin-orange w-full mt-4"
                >
                  Try AI assistant
                </button>
              </div>
            </div>

            {/* contact strip */}
            <div className="bg-white border border-[#DADAD9]">
              <div className="benjamin-bar">Still need help?</div>
              <div className="p-4 space-y-2.5">
                <button
                  onClick={() => {
                    useApp.getState().setChatSupplierId(null);
                    useApp.getState().setChatProductId(null);
                    useApp.getState().setView("chat");
                  }}
                  className="btn-square-black w-full flex items-center gap-2 justify-center"
                >
                  <MessageCircle className="w-4 h-4" /> Chat now
                </button>
                <a
                  href="https://wa.me/2250707365136"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#25D366] text-white text-[12px] font-bold uppercase tracking-wide px-4 py-2.5 hover:opacity-90"
                >
                  <MessageCircle className="w-4 h-4" /> WhatsApp : +225 0707 36 51 36
                </a>
                <a
                  href="tel:+2250707365136"
                  className="w-full inline-flex items-center justify-center gap-2 border border-[#DADAD9] text-[#222] text-[12px] font-bold uppercase tracking-wide px-4 py-2.5 hover:bg-[#F5F5F5]"
                >
                  <Phone className="w-4 h-4" /> Appeler : +225 0707 36 51 36
                </a>
                <a
                  href={`mailto:${brandEmail("support")}`}
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#337AB7] text-white text-[12px] font-bold uppercase tracking-wide px-4 py-2.5 hover:opacity-90"
                >
                  <Mail className="w-4 h-4" /> Email support
                </a>
                <div className="text-[11px] text-[#888] pt-1 text-center">
                  Avg. response time: <span className="font-bold text-[#16A34A]">under 2 min</span>
                </div>
              </div>
            </div>

            {/* popular quick links */}
            <div className="bg-white border border-[#DADAD9] p-4">
              <div className="benjamin-section-title mb-2">Quick actions</div>
              <ul className="text-[12px] space-y-1">
                <QuickLink label="Open a dispute" onClick={() => toast.info("Opening dispute form")} />
                <QuickLink label="Track an order" onClick={() => toast.info("Track order")} />
                <QuickLink label="Request a quotation" onClick={() => setView("rfq")} />
                <QuickLink label="Become a supplier" onClick={() => setView("auth")} />
                <QuickLink label="Browse products" onClick={() => setView("home")} />
              </ul>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}

function QuickLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <li>
      <button onClick={onClick} className="w-full text-left flex items-center justify-between group py-1.5 hover:text-[#FF6A00]">
        <span>{label}</span>
        <ChevronRight className="w-3.5 h-3.5 text-[#FF6A00] opacity-0 group-hover:opacity-100" />
      </button>
    </li>
  );
}
