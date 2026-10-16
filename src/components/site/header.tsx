"use client";

import { useEffect, useState } from "react";
import {
  Search, Camera, FileUp, Menu, ShoppingCart, User, Globe, ChevronDown,
  X, MapPin, Bot, MessageCircle,
} from "lucide-react";
import { useApp } from "@/lib/store";
import type { CategoryNode } from "@/lib/format";
import { TR } from "@/lib/format";
import { CatIcon } from "./cat-icon";
import { BrandLogo } from "./brand-logo";
import { AccountMenu, Avatar } from "./account-menu";
import { homeViewForRole } from "@/lib/store";
import { BRAND } from "@/lib/brand";

const SUGGESTIONS = {
  fr: [
    "baskets",
    "panneaux solaires 450W",
    "t-shirts coton en gros",
    "écouteurs Bluetooth OEM",
    "ruban LED 5m",
    "coques de téléphone en gros",
    "farine d'igname 25kg",
    "casques de sécurité",
    "sacs à dos logo personnalisé",
    "climatiseur split",
  ],
  en: [
    "sneakers",
    "solar panels 450W",
    "wholesale t-shirts cotton",
    "Bluetooth earbuds OEM",
    "LED strip 5m",
    "phone cases bulk",
    "yam flour 25kg",
    "safety helmets",
    "backpacks custom logo",
    "air conditioner split",
  ],
};

export function Header({ categories }: { categories: CategoryNode[] }) {
  const {
    setView, view, searchQuery, setSearchQuery, categoryId, setCategoryId,
    currency, setCurrency, lang, setLang, cart, user, signOut, setAuthMode, chatUnread,
  } = useApp();
  const t = TR[lang];
  const suggestions = SUGGESTIONS[lang];
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [phIndex, setPhIndex] = useState(0);
  const [mobileSearch, setMobileSearch] = useState(false);
  const [globeOpen, setGlobeOpen] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setPhIndex((i) => (i + 1) % suggestions.length), 2600);
    return () => clearInterval(t);
  }, [suggestions.length]);

  function doSearch(q?: string) {
    setSearchQuery(q ?? searchQuery);
    setView("search");
  }

  function openCategory(catId: string) {
    setCategoryId(catId);
    setSearchQuery("");
    setView("search");
    setMenuOpen(false);
    setMobileMenu(false);
  }

  const cartCount = cart.reduce((n, l) => n + l.quantity, 0);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#DADAD9]">
      {/* ROW 1 */}
      <div className="max-w-[1280px] mx-auto px-3 lg:px-6">
        <div className="flex items-center gap-2 md:gap-3 h-14 md:h-16">
          {/* burger / mobile menu */}
          <button
            className="md:hidden p-1"
            onClick={() => setMobileMenu(true)}
            aria-label="Menu"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* logo */}
          <button
            onClick={() => setView("home")}
            className="flex items-center gap-2 shrink-0"
            aria-label={`${BRAND.name} — accueil`}
          >
            <BrandLogo size={40} />
          </button>

          {/* search bar (desktop) */}
          <div className="hidden md:flex flex-1 items-center border-2 border-[#1A1F8A] h-10 bg-white">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doSearch()}
              placeholder={`${t.search_placeholder} · ${suggestions[phIndex]}`}
              className="flex-1 h-full px-3 text-[13px] outline-none bg-transparent placeholder:text-[#999]"
            />
            <button className="px-2 h-full border-l border-[#ECECEC] hover:bg-[#ECECEC]" title={lang === "fr" ? "Recherche par image" : "Image search"} onClick={() => doSearch()}>
              <Camera className="w-5 h-5 text-[#555]" strokeWidth={1.6} />
            </button>
            <button className="px-2 h-full border-l border-[#ECECEC] hover:bg-[#ECECEC]" title={lang === "fr" ? "Recherche par fichier" : "Search with file"}>
              <FileUp className="w-5 h-5 text-[#555]" strokeWidth={1.6} />
            </button>
            <button
              onClick={() => doSearch()}
              className="bg-[#FF6A00] text-white font-bold uppercase text-[12px] px-5 h-full tracking-wider hover:bg-[#E55A00] flex items-center gap-1.5"
            >
              <Search className="w-4 h-4" strokeWidth={2} />
              {lang === "fr" ? "Rechercher" : "Search"}
            </button>
          </div>

          {/* account (mobile) */}
          <div className="md:hidden ml-auto">
            <AccountMenu compact />
          </div>

          {/* deliver to */}
          <div className="hidden lg:flex items-center gap-1.5 px-2 cursor-pointer hover:text-[#FF6A00]">
            <MapPin className="w-4 h-4 text-[#FF6A00]" strokeWidth={1.8} />
            <div className="leading-tight">
              <div className="text-[9px] text-[#888] uppercase">{t.deliver_to}</div>
              <div className="text-[12px] font-semibold flex items-center gap-1 whitespace-nowrap">
                🇨🇮 Côte d'Ivoire <ChevronDown className="w-3 h-3" />
              </div>
            </div>
          </div>

          {/* globe / currency / lang */}
          <div className="relative hidden lg:block">
            <button
              onClick={() => setGlobeOpen((v) => !v)}
              className="flex items-center gap-1.5 px-2 py-1 hover:text-[#FF6A00]"
            >
              <Globe className="w-4 h-4" />
              <div className="leading-tight">
                <div className="text-[12px] font-semibold">{currency}</div>
                <div className="text-[9px] text-[#888] uppercase">{lang === "en" ? "English" : "Français"}</div>
              </div>
            </button>
            {globeOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-[#DADAD9] w-44 p-3 z-50">
                <div className="text-[10px] uppercase font-bold text-[#888] mb-1">{lang === "fr" ? "Devise" : "Currency"}</div>
                <div className="flex gap-1 mb-3">
                  {(["XOF", "GHS", "USD"] as const).map((c) => (
                    <button
                      key={c}
                      onClick={() => { setCurrency(c); setGlobeOpen(false); }}
                      className={`px-2 py-1 text-[11px] font-semibold border ${currency === c ? "bg-[#FF6A00] text-white border-[#FF6A00]" : "border-[#DADAD9]"}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <div className="text-[10px] uppercase font-bold text-[#888] mb-1">{lang === "fr" ? "Langue" : "Language"}</div>
                <div className="flex gap-1">
                  {(["fr", "en"] as const).map((l) => (
                    <button
                      key={l}
                      onClick={() => { setLang(l); setGlobeOpen(false); }}
                      className={`px-2 py-1 text-[11px] font-semibold border ${lang === l ? "bg-[#0A0F4D] text-white border-[#0A0F4D]" : "border-[#DADAD9]"}`}
                    >
                      {l === "fr" ? "FR" : "EN"}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* messages (signed-in users) */}
          {user && (
            <button
              onClick={() => setView("chat")}
              className="relative flex items-center gap-1 px-2 hover:text-[#FF6A00]"
              aria-label={chatUnread ? `Messages (${chatUnread} non lus)` : "Messages"}
            >
              <div className="relative">
                <MessageCircle className="w-6 h-6" strokeWidth={1.6} />
                {chatUnread > 0 && (
                  <span className="absolute -top-2 -right-2 bg-[#FF6A00] text-white text-[10px] font-bold min-w-4 h-4 px-0.5 flex items-center justify-center">
                    {chatUnread > 99 ? "99+" : chatUnread}
                  </span>
                )}
              </div>
              <span className="hidden lg:inline text-[12px] font-semibold">Messages</span>
            </button>
          )}

          {/* cart */}
          <button onClick={() => setView("cart")} className="relative flex items-center gap-1 px-2 hover:text-[#FF6A00]">
            <div className="relative">
              <ShoppingCart className="w-6 h-6" strokeWidth={1.6} />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-[#FF6A00] text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </div>
            <span className="hidden lg:inline text-[12px] font-semibold">{lang === "fr" ? "Panier" : "Cart"}</span>
          </button>

          {/* account (desktop) */}
          <div className="hidden md:block">
            <AccountMenu />
          </div>
        </div>

        {/* mobile search bar (always visible) */}
        <div className="md:hidden pb-2.5">
          <div className={`flex items-center border-2 h-10 bg-white ${mobileSearch ? "border-[#FF6A00]" : "border-[#1A1F8A]"}`}>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setMobileSearch(true)}
              onBlur={() => setMobileSearch(false)}
              onKeyDown={(e) => e.key === "Enter" && doSearch()}
              placeholder={t.search_placeholder}
              className="flex-1 min-w-0 h-full px-3 text-[14px] outline-none bg-transparent placeholder:text-[#999]"
            />
            <button className="px-2.5 h-full border-l border-[#ECECEC]" aria-label={lang === "fr" ? "Recherche par image" : "Image search"} onClick={() => doSearch()}>
              <Camera className="w-5 h-5 text-[#555]" strokeWidth={1.6} />
            </button>
            <button onClick={() => doSearch()} className="bg-[#FF6A00] text-white w-11 h-full flex items-center justify-center shrink-0" aria-label="Search">
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* ROW 2 (tablet / desktop) */}
      <div className="hidden md:block border-t border-[#ECECEC] bg-white">
        <div className="max-w-[1280px] mx-auto px-3 lg:px-6 flex items-center h-10 text-[12px]">
          <div
            className="relative"
            onMouseEnter={() => setMenuOpen(true)}
            onMouseLeave={() => setMenuOpen(false)}
          >
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 font-bold uppercase tracking-wide whitespace-nowrap h-10 pr-4 text-[#333] hover:text-[#FF6A00]"
            >
              <Menu className="w-5 h-5" />
              {t.all_categories}
            </button>

            {/* MEGA MENU */}
            {menuOpen && (
              <div className="absolute left-0 top-full bg-white border border-[#DADAD9] z-50 flex">
                {/* left list */}
                <div className="w-64 max-h-[70vh] overflow-y-auto benjamin-scroll border-r border-[#ECECEC]">
                  {categories.map((c) => (
                    <div
                      key={c.id}
                      onMouseEnter={() => setActiveCat(c.id)}
                      onClick={() => openCategory(c.id)}
                      className={`benjamin-tile border-0 border-b border-[#ECECEC] ${activeCat === c.id || categoryId === c.id ? "active" : ""}`}
                    >
                      <CatIcon name={c.icon} className="w-4 h-4 shrink-0" />
                      <span className="flex-1 truncate">{c.name}</span>
                      <span className="benjamin-tile-arrow text-[14px]">›</span>
                    </div>
                  ))}
                </div>
                {/* right flyout subcategories */}
                {activeCat && (
                  <div className="w-[440px] p-4">
                    <div className="benjamin-section-title mb-3">
                      {categories.find((c) => c.id === activeCat)?.name}
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                      {categories
                        .find((c) => c.id === activeCat)
                        ?.children?.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => openCategory(s.id)}
                            className="text-left text-[12px] text-[#333] hover:text-[#FF6A00] hover:underline py-0.5"
                          >
                            {s.name}
                          </button>
                        ))}
                    </div>
                    <button
                      onClick={() => openCategory(activeCat)}
                      className="btn-benjamin-orange mt-4 text-[11px]"
                    >
                      {lang === "fr" ? "Voir tout" : "View all"} ›
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <nav className="flex items-center gap-5 ml-2">
            <button onClick={() => setView("manufacturers")} className="hover:text-[#FF6A00] font-semibold uppercase tracking-wide whitespace-nowrap text-[11px]">
              {t.verified_manufacturers}
            </button>
            <button onClick={() => setView("dropshipping")} className="hover:text-[#FF6A00] font-semibold uppercase tracking-wide whitespace-nowrap text-[11px]">
              {t.dropshipping}
            </button>
          </nav>

          <nav className="ml-auto flex items-center gap-5">
            <button onClick={() => setView("home")} className="hover:text-[#FF6A00] font-semibold uppercase tracking-wide whitespace-nowrap text-[11px] hidden sm:inline">
              {t.about_us}
            </button>
            <button onClick={() => setView("help")} className="hover:text-[#FF6A00] font-semibold uppercase tracking-wide whitespace-nowrap text-[11px]">
              {t.help_center}
            </button>
            <button className="hover:text-[#FF6A00] font-semibold uppercase tracking-wide whitespace-nowrap text-[11px] flex items-center gap-1 hidden sm:flex">
              <Bot className="w-3.5 h-3.5 text-[#FF6A00]" />
              {t.ai_assistant}
            </button>
            <button onClick={() => setView("supplier-dashboard")} className="btn-benjamin-orange text-[11px] hidden md:inline-flex">
              {t.sell_on}
            </button>
          </nav>
        </div>
      </div>

      {/* SEARCH TABS (home only) */}
      {view === "home" && (
        <div className="hidden md:block border-t border-[#ECECEC] bg-[#fafafa]">
          <div className="max-w-[1280px] mx-auto px-3 lg:px-6 flex items-center h-9 gap-1 text-[12px]">
            {[
              { k: t.ai_mode, v: "home", icon: Bot },
              { k: t.products, v: "home" },
              { k: t.manufacturers, v: "manufacturers" },
              { k: t.worldwide, v: "home" },
            ].map((tt) => (
              <button
                key={tt.k}
                onClick={() => tt.v !== "home" && setView(tt.v as any)}
                className="px-3 h-7 font-semibold uppercase tracking-wide whitespace-nowrap hover:text-[#FF6A00] hover:bg-white"
              >
                {tt.k}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* MOBILE MENU DRAWER */}
      {mobileMenu && (
        <div className="fixed inset-0 z-[70] bg-black/50 md:hidden" onClick={() => setMobileMenu(false)}>
          <div className="absolute left-0 top-0 bottom-0 w-[85vw] max-w-[320px] bg-white overflow-y-auto benjamin-scroll" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 border-b border-[#ECECEC]">
              <BrandLogo size={36} />
              <button onClick={() => setMobileMenu(false)}><X className="w-5 h-5" /></button>
            </div>
            {/* account quick links */}
            <div className="p-3 border-b border-[#ECECEC]">
              {user ? (
                <div className="flex items-center gap-3">
                  <Avatar size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-bold truncate">{user.name ?? user.email}</div>
                    <button onClick={() => { setView(homeViewForRole(user.role)); setMobileMenu(false); }} className="benjamin-link text-[12px]">Mon espace</button>
                  </div>
                  <button onClick={async () => { setMobileMenu(false); await signOut(); }} className="text-[11px] font-bold uppercase text-[#B91C1C]">Déconnexion</button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => { setAuthMode("login"); setView("auth"); setMobileMenu(false); }} className="btn-square-black !px-2 text-[11px]">
                    Se connecter
                  </button>
                  <button onClick={() => { setAuthMode("signup"); setView("auth"); setMobileMenu(false); }} className="btn-benjamin-orange !px-2 text-[11px]">
                    Créer un compte
                  </button>
                </div>
              )}
            </div>
            {[
              { label: t.verified_manufacturers, v: "manufacturers" },
              { label: t.dropshipping, v: "dropshipping" },
              { label: lang === "fr" ? "Demande de devis" : "Request for quotation", v: "rfq" },
              { label: lang === "fr" ? "Top classement" : "Top ranking", v: "ranking" },
              { label: t.help_center, v: "help" },
            ].map((l) => (
              <button
                key={l.v}
                onClick={() => { setView(l.v as any); setMobileMenu(false); }}
                className="w-full flex items-center px-3 py-3 border-b border-[#ECECEC] text-left text-[13px] font-semibold uppercase tracking-wide hover:bg-[#ECECEC]"
              >
                {l.label}
                <span className="ml-auto text-[#999]">›</span>
              </button>
            ))}
            {/* currency + language */}
            <div className="p-3 border-b border-[#ECECEC] flex items-center gap-1.5 flex-wrap">
              {(["XOF", "GHS", "USD"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`px-2.5 py-1.5 text-[11px] font-semibold border ${currency === c ? "bg-[#FF6A00] text-white border-[#FF6A00]" : "border-[#DADAD9]"}`}
                >
                  {c}
                </button>
              ))}
              <span className="w-px h-5 bg-[#DADAD9] mx-1" />
              {(["fr", "en"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-2.5 py-1.5 text-[11px] font-semibold border ${lang === l ? "bg-[#0A0F4D] text-white border-[#0A0F4D]" : "border-[#DADAD9]"}`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="px-3 pt-4 pb-2 text-[11px] font-bold uppercase tracking-wider text-[#888]">
              {t.all_categories}
            </div>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => openCategory(c.id)}
                className="w-full flex items-center gap-2 px-3 py-2.5 border-b border-[#ECECEC] text-left hover:bg-[#ECECEC]"
              >
                <CatIcon name={c.icon} className="w-4 h-4 text-[#FF6A00]" />
                <span className="text-[13px]">{c.name}</span>
                <span className="ml-auto text-[#999]">›</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
