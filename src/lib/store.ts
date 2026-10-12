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

  // auth (mocked client side)
  user: { name: string; email: string; role: "BUYER" | "SUPPLIER" | "ADMIN" } | null;
  signIn: (name: string, email: string, role: "BUYER" | "SUPPLIER" | "ADMIN") => void;
  signOut: () => void;
}

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

  user: null,
  signIn: (name, email, role) => set({ user: { name, email, role } }),
  signOut: () => set({ user: null }),
}));
