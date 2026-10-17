"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Currency, Lang, ViewKey } from "./format";

export interface CartLine {
  productId: string;
  title: string;
  image: string;
  price: number; // GHS
  quantity: number;
  unit: string;
  variant?: string;
  supplierId: string;
  supplierName: string;
}

interface AppState {
  view: ViewKey;
  setView: (v: ViewKey) => void;

  productId: string | null;
  setProductId: (id: string | null) => void;

  supplierId: string | null;
  setSupplierId: (id: string | null) => void;

  // Chat context — supplier & product to focus on when opening chat view
  chatSupplierId: string | null;
  setChatSupplierId: (id: string | null) => void;
  chatProductId: string | null;
  setChatProductId: (id: string | null) => void;
  /** Total unread chat messages (header badge) */
  chatUnread: number;
  refreshChatUnread: () => Promise<void>;
  /** Opens the chat with a supplier, optionally about a product */
  openChat: (supplierId?: string | null, productId?: string | null) => void;

  searchQuery: string;
  setSearchQuery: (q: string) => void;

  categoryId: string | null;
  setCategoryId: (id: string | null) => void;

  currency: Currency;
  setCurrency: (c: Currency) => void;

  lang: Lang;
  setLang: (l: Lang) => void;

  cart: CartLine[];
  addToCart: (line: CartLine) => void;
  removeFromCart: (productId: string, variant?: string) => void;
  updateQty: (productId: string, qty: number, variant?: string) => void;
  clearCart: () => void;
  /** Removes the lines that were just ordered (by product + option). */
  removeOrdered: (lines: { productId: string; variant?: string | null }[]) => void;
  /** Tab to open next time a dashboard mounts (e.g. "orders" after checkout). */
  dashboardTab: string | null;
  openDashboard: (view: ViewKey, tab: string) => void;

  /** Saved product ids (stored on the account) */
  favorites: string[];
  loadFavorites: () => Promise<void>;
  /** Adds / removes a favorite; visitors are sent to the login screen. */
  toggleFavorite: (id: string) => Promise<"added" | "removed" | "login" | "error">;

  // filters for search
  filters: Record<string, unknown>;
  setFilter: (k: string, v: unknown) => void;
  resetFilters: () => void;

  // auth — source of truth is the server (/api/me, Supabase session cookie)
  authStatus: "loading" | "guest" | "authenticated";
  user: SessionUser | null;
  setSession: (user: SessionUser | null) => void;
  /** Re-reads the profile from the server */
  refreshSession: () => Promise<SessionUser | null>;
  signOut: () => Promise<void>;
  /** Auth screen mode requested by navigation (e.g. "signup" from a CTA, "reset" from email link) */
  authMode: "login" | "signup" | "forgot" | "reset";
  setAuthMode: (m: "login" | "signup" | "forgot" | "reset") => void;
}

export type Role = "BUYER" | "SUPPLIER" | "ADMIN";
export interface SessionUser {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  role: Role;
  /** Super admins manage other admins and every role */
  isSuperAdmin: boolean;
  status: string;
  supplier: MerchantShop | null;
}

export type MerchantStatus = "pending" | "approved" | "rejected" | "suspended";
export interface MerchantShop {
  id: string;
  name: string;
  slug: string;
  status: MerchantStatus;
  statusReason: string | null;
  phone: string | null;
  city: string;
  country: string;
  mainCategory: string | null;
  description: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

/** Dashboard view for a role */
export const homeViewForRole = (role: Role): ViewKey =>
  role === "ADMIN" ? "admin" : role === "SUPPLIER" ? "supplier-dashboard" : "buyer-dashboard";

export const useApp = create<AppState>()(
  persist(
  (set, get) => ({
  view: "home",
  setView: (v) => {
    set({ view: v });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  },

  productId: null,
  setProductId: (id) => set({ productId: id }),

  supplierId: null,
  setSupplierId: (id) => set({ supplierId: id }),

  chatSupplierId: null,
  setChatSupplierId: (id) => set({ chatSupplierId: id }),
  chatProductId: null,
  setChatProductId: (id) => set({ chatProductId: id }),
  chatUnread: 0,
  refreshChatUnread: async () => {
    try {
      const r = await fetch("/api/chat/unread", { cache: "no-store", credentials: "same-origin" });
      const d = (await r.json().catch(() => ({}))) as { unread?: number };
      if (r.ok) set({ chatUnread: Math.max(0, Number(d.unread) || 0) });
    } catch {
      /* offline: keep the last value */
    }
  },
  openChat: (supplierId, productId) => {
    set({ chatSupplierId: supplierId ?? null, chatProductId: productId ?? null, view: "chat" });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  },

  searchQuery: "",
  setSearchQuery: (q) => set({ searchQuery: q }),

  categoryId: null,
  setCategoryId: (id) => set({ categoryId: id }),

  currency: "XOF",
  setCurrency: (c) => set({ currency: c }),

  lang: "fr",
  setLang: (l) => set({ lang: l }),

  cart: [],
  addToCart: (line) =>
    set((s) => {
      const idx = s.cart.findIndex(
        (c) => c.productId === line.productId && c.variant === line.variant,
      );
      if (idx >= 0) {
        const next = [...s.cart];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + line.quantity };
        return { cart: next };
      }
      return { cart: [...s.cart, line] };
    }),
  removeFromCart: (productId, variant) =>
    set((s) => ({
      cart: s.cart.filter(
        (c) => !(c.productId === productId && c.variant === variant),
      ),
    })),
  updateQty: (productId, qty, variant) =>
    set((s) => ({
      cart: s.cart.map((c) =>
        c.productId === productId && c.variant === variant
          ? { ...c, quantity: Math.max(1, qty) }
          : c,
      ),
    })),
  clearCart: () => set({ cart: [] }),
  removeOrdered: (lines) =>
    set((s) => ({
      cart: s.cart.filter((c) => !lines.some((l) => l.productId === c.productId && (l.variant ?? undefined) === (c.variant ?? undefined))),
    })),
  dashboardTab: null,
  openDashboard: (view, tab) => {
    set({ view, dashboardTab: tab });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  },

  favorites: [],
  loadFavorites: async () => {
    try {
      const r = await fetch("/api/me/favorites", { cache: "no-store", credentials: "same-origin" });
      if (!r.ok) return;
      const d = (await r.json()) as { ids?: string[] };
      set({ favorites: d.ids ?? [] });
    } catch {
      /* offline */
    }
  },
  toggleFavorite: async (id) => {
    // Favorites are saved on the account: a visitor is invited to sign in.
    if (get().authStatus !== "authenticated") {
      set({ authMode: "login", view: "auth" });
      return "login";
    }
    const was = get().favorites.includes(id);
    set((s) => ({ favorites: was ? s.favorites.filter((f) => f !== id) : [...s.favorites, id] }));
    try {
      const r = was
        ? await fetch(`/api/me/favorites?productId=${encodeURIComponent(id)}`, { method: "DELETE", credentials: "same-origin" })
        : await fetch("/api/me/favorites", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId: id }),
          });
      if (!r.ok) throw new Error();
      return was ? "removed" : "added";
    } catch {
      // Roll back the optimistic change.
      set((s) => ({ favorites: was ? [...s.favorites, id] : s.favorites.filter((f) => f !== id) }));
      return "error";
    }
  },

  filters: {},
  setFilter: (k, v) =>
    set((s) => ({ filters: { ...s.filters, [k]: v } })),
  resetFilters: () => set({ filters: {} }),

  authStatus: "loading",
  user: null,
  setSession: (user) => set({ user, authStatus: user ? "authenticated" : "guest" }),
  refreshSession: async () => {
    try {
      const r = await fetch("/api/me", { cache: "no-store", credentials: "same-origin" });
      const d = (await r.json().catch(() => ({}))) as { user?: SessionUser | null };
      const user = r.ok ? d.user ?? null : null;
      set({ user, authStatus: user ? "authenticated" : "guest" });
      return user;
    } catch {
      set({ user: null, authStatus: "guest" });
      return null;
    }
  },
  signOut: async () => {
    const { getSupabaseBrowser } = await import("./supabase/client");
    await getSupabaseBrowser().auth.signOut();
    set({ user: null, authStatus: "guest", view: "home", chatUnread: 0, favorites: [] });
  },
  authMode: "login",
  setAuthMode: (m) => set({ authMode: m }),
  }),
  {
    // Only the cart survives a reload (per browser). Rehydrated after mount to avoid SSR mismatch.
    name: "ijobsc-cart",
    version: 1,
    storage: createJSONStorage(() => localStorage),
    partialize: (s) => ({ cart: s.cart }),
    skipHydration: true,
  },
  ),
);

/**
 * Dashboard tab state that honours `openDashboard(view, tab)` requests — on mount
 * and while the dashboard is already open (e.g. after a payment return).
 */
export function useDashboardTab<T extends string>(initial: T, allowed: readonly T[]) {
  const [tab, setTab] = useState<T>(() => {
    const t = useApp.getState().dashboardTab as T | null;
    return t && allowed.includes(t) ? t : initial;
  });
  const requested = useApp((s) => s.dashboardTab) as T | null;
  useEffect(() => {
    if (!requested) return;
    const t = setTimeout(() => {
      if (allowed.includes(requested)) setTab(requested);
      useApp.setState({ dashboardTab: null });
    }, 0);
    return () => clearTimeout(t);
  }, [requested, allowed]);
  return [tab, setTab] as const;
}
