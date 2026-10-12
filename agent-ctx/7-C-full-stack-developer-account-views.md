# Task 7-C — full-stack-developer (account views)

## Files created

All in `src/components/site/`:

1. **`auth-view.tsx`** → `export function AuthView()`
   - Buyer/Supplier tab toggle, OTP flow with input-otp component, Google button,
     demo creds hint, side Trade Assurance promo panel (hidden on mobile).

2. **`buyer-dashboard.tsx`** → `export function BuyerDashboard()`
   - Sign-in gate, sidebar with 5 tabs (Orders/RFQs/Favorites/Addresses/Account),
     responsive (vertical desktop / horizontal scroll mobile), skeletons + empty
     states, mock orders table + `/api/rfq` list + favorites grid + sample
     addresses + account form with currency picker.

3. **`supplier-dashboard.tsx`** → `export function SupplierDashboard()`
   - KPI row (Products/Orders/Revenue/Payouts), 8 sidebar tabs (Products, Prices &
     Tiers, Stock, Orders, Quotes, Store Design, Payouts, Verification).
     Products tab fetches `/api/products?take=12`, Tiers editor fetches first
     product, Stock/Orders/Quotes/Payouts/Verification all mock data with
     editable UI.

4. **`admin-view.tsx`** → `export function AdminView()`
   - ADMIN role gate (sign in as admin button), 6 KPI cards (Users/Suppliers/
     Products/GMV/Pending disputes/Commissions), 7 tabs (Users/Supplier
     Verification/Categories/Banners/Commissions/Disputes/Reports). Fetches
     `/api/suppliers`, `/api/products?take=1`, `/api/categories`.

5. **`help-view.tsx`** → `export function HelpView()`
   - Dark hero search, 8 category tiles grid, 10-Q FAQ accordion (shadcn
     accordion), black AI Assistant promo card, contact strip (Chat/WhatsApp/
     Email), Quick actions links.

## Design system compliance

- All views `"use client"`, single named export each.
- AELF classes used everywhere: `.aelf-bar`, `.aelf-bar-red`, `.aelf-tile`
  with `.active` for selected sidebar item, `.btn-aelf-red`, `.btn-square-black`,
  `.btn-outline-grey`, `.aelf-section-title`, `.aelf-link`, `.aelf-scroll`.
- No border-radius, no shadows (matches globals.css `* { border-radius: 0 !important; box-shadow: none !important }`).
- Mobile-first responsive: grids 2 cols mobile → 3-6 desktop; sidebar tabs
  horizontal scroll on mobile.
- `<Toaster />` from `sonner` mounted in each view (layout.tsx uses radix
  toaster, so this guarantees the toasts actually render).
- All toasts via `import { toast, Toaster } from "sonner"` per spec.

## Data contract honored

- `import { useApp } from "@/lib/store"` — uses `view`, `setView`, `user`,
  `signIn`, `signOut`, `currency`, `setCurrency`, `favorites`.
- `import { formatPrice, type ProductT, type SupplierT, type CategoryNode, type Currency } from "@/lib/format"`.
- `import { ProductCard } from "./product-card"` (buyer favorites tab).
- APIs called client-side: `GET /api/products?take=…`, `GET /api/rfq`,
  `GET /api/suppliers`, `GET /api/categories`. All already exist and are tested.

## Quality

- `bunx eslint` on the 5 files: clean.
- `bunx tsc --noEmit -p tsconfig.json`: no errors in any of the 5 files
  (errors exist in other agents' files and skills/ — none mine).
- Skeletons shown during fetch; empty states for favorites & RFQs.
- No new routes, no edits to globals.css / layout.tsx / schema.prisma /
  existing components.

## Decisions / notes

- Sign-out returns to `home` view and toasts "Signed out".
- Buyer sign-in uses demo OTP "123456" (hint shown below OTP input).
- `ProductRow` in supplier dashboard uses an `active` state to toggle
  Active/Paused badge (UI only — no API mutation).
- Verification checklist uses 3 states (verified / pending / missing) with
  distinct icons.
- Admin "Sign in as admin" button calls `signIn("Admin", "admin@aelfbazaar.com", "ADMIN")`
  and toasts success.
- Help view's "Request a quotation" Quick Action calls `setView("rfq")`;
  "Become a supplier" calls `setView("auth")`; "Browse products" calls
  `setView("home")` — cross-view navigation via the store.
- Mobile sidebar: horizontal scroll with `whitespace-nowrap shrink-0` items
  inside an `overflow-x-auto aelf-scroll` flex row.
