"use client";

import { create } from "zustand";
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

  favorites: string[];
  toggleFavorite: (id: string) => void;

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
  status: string;
  supplier: { id: string; name: string; slug: string; status: "pending" | "approved" | "rejected" } | null;
}

/** Dashboard view for a role */
export const homeViewForRole = (role: Role): ViewKey =>
  role === "ADMIN" ? "admin" : role === "SUPPLIER" ? "supplier-dashboard" : "buyer-dashboard";

export const useApp = create<AppState>((set) => ({
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

  favorites: [],
  toggleFavorite: (id) =>
    set((s) => ({
      favorites: s.favorites.includes(id)
        ? s.favorites.filter((f) => f !== id)
        : [...s.favorites, id],
    })),

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
    set({ user: null, authStatus: "guest", view: "home" });
  },
  authMode: "login",
  setAuthMode: (m) => set({ authMode: m }),
}));
