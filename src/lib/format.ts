// Ivoire Jobs Connexion (I.JOBS.C) — shared types & helpers

import { BRAND } from "@/lib/brand";
export type Currency = "GHS" | "XOF" | "USD";
export type Lang = "en" | "fr";

export const CURRENCY_RATES: Record<Currency, number> = {
  GHS: 1, // base currency in DB is GHS
  XOF: 65.4,
  USD: 0.078,
};

export const CURRENCY_SYMBOL: Record<Currency, string> = {
  GHS: "GH₵",
  XOF: "CFA",
  USD: "$",
};

export function formatPrice(ghs: number, currency: Currency): string {
  const v = ghs * CURRENCY_RATES[currency];
  const sym = CURRENCY_SYMBOL[currency];
  if (currency === "USD") return `${sym}${v.toFixed(2)}`;
  if (currency === "XOF") return `${Math.round(v).toLocaleString("en-US")} ${sym}`;
  return `${sym}${v.toFixed(2)}`;
}

export interface PriceTierT {
  minQty: number;
  maxQty: number | null;
  price: number;
  unit: string;
}

export interface KeyAttr {
  k: string;
  v: string;
}

export interface VariantT {
  name: string;
  options: string[];
}

export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  parentId?: string | null;
  order: number;
  children?: CategoryNode[];
}

export interface ProductT {
  id: string;
  title: string;
  slug: string;
  description: string;
  categoryId: string;
  categoryName?: string;
  supplierId: string;
  supplierName?: string;
  supplierVerified?: boolean;
  images: string[];
  videoUrl?: string | null;
  minOrder: string;
  minOrderUnit: string;
  unit: string;
  sold: number;
  popularity: number;
  rating: number;
  reviewCount: number;
  reorderRate: number;
  lowestPrice: boolean;
  certifications: string[];
  keyAttributes: KeyAttr[];
  variants: VariantT[];
  tradeAssurance: boolean;
  readyToShip: boolean;
  customizable: boolean;
  rank: number;
  priceTiers: PriceTierT[];
  storeRating?: number;
  responseTime?: string;
  onTimeDispatch?: number;
  city?: string;
  country?: string;
  years?: number;
}

export interface SupplierT {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  city: string;
  country: string;
  years: number;
  type: string;
  verified: boolean;
  storeRating: number;
  responseTime: string;
  onTimeDispatch: number;
  reorderRate: number;
  mainCategory?: string | null;
  employees?: string | null;
  annualRevenue?: string | null;
  certifications: string[];
  markets: string[];
  productCount?: number;
}

export const TR = {
  en: {
    search_placeholder: "What are you looking for?",
    deliver_to: "Deliver to",
    create_account: "Create account",
    sign_in: "Sign in",
    all_categories: "All categories",
    verified_manufacturers: "Verified manufacturers",
    dropshipping: "Dropshipping",
    about_us: "About us",
    help_center: "Help Center",
    ai_assistant: "AI assistant",
    sell_on: `Sell on ${BRAND.shortName}`,
    ai_mode: "AI Mode",
    products: "Products",
    manufacturers: "Manufacturers",
    worldwide: "Worldwide",
    welcome: `Welcome to ${BRAND.name}`,
    rfq: "Request for Quotation",
    top_ranking: "Top Ranking",
    fast_customization: "Fast customization",
    categories_for_you: "Categories for you",
    frequently_searched: "Frequently searched",
    just_for_you: "Just for you",
    add_to_cart: "Add to cart",
    chat_now: "Chat now",
    send_inquiry: "Send inquiry",
    buy_now: "Buy now",
    reorder_rate: "Reorder rate",
    sold: "sold",
    verified: "Verified",
    moq: "Min. order",
    sort_relevance: "Sort by relevance",
    showing_results: "Showing products for",
    chat_with_us: "Chat with us",
  },
  fr: {
    search_placeholder: "Que recherchez-vous ?",
    deliver_to: "Livrer à",
    create_account: "Créer un compte",
    sign_in: "Se connecter",
    all_categories: "Toutes catégories",
    verified_manufacturers: "Fabricants vérifiés",
    dropshipping: "Dropshipping",
    about_us: "À propos",
    help_center: "Centre d'aide",
    ai_assistant: "Assistant IA",
    sell_on: `Vendre sur ${BRAND.shortName}`,
    ai_mode: "Mode IA",
    products: "Produits",
    manufacturers: "Fabricants",
    worldwide: "Mondial",
    welcome: `Bienvenue sur ${BRAND.name}`,
    rfq: "Demande de devis",
    top_ranking: "Top classement",
    fast_customization: "Personnalisation rapide",
    categories_for_you: "Catégories pour vous",
    frequently_searched: "Recherches fréquentes",
    just_for_you: "Pour vous",
    add_to_cart: "Ajouter au panier",
    chat_now: "Discuter",
    send_inquiry: "Envoyer demande",
    buy_now: "Acheter",
    reorder_rate: "Taux de réachat",
    sold: "vendus",
    verified: "Vérifié",
    moq: "Commande min.",
    sort_relevance: "Trier par pertinence",
    showing_results: "Résultats pour",
    chat_with_us: "Discutez avec nous",
  },
} as const;

export type ViewKey =
  | "home"
  | "search"
  | "product"
  | "cart"
  | "checkout"
  | "supplier"
  | "rfq"
  | "ranking"
  | "dropshipping"
  | "manufacturers"
  | "auth"
  | "buyer-dashboard"
  | "supplier-dashboard"
  | "admin"
  | "help"
  | "chat";
