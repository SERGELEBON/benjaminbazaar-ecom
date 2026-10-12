# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AELF Bazaar — an Alibaba-style B2B e-commerce platform built with Next.js 16, React 19, TypeScript, Prisma (SQLite), and Tailwind CSS. The application is a single-page app (SPA) using client-side routing managed by Zustand store, with multiple view components rendered based on application state.

## Tech Stack

- **Framework**: Next.js 16 (App Router, standalone output)
- **Runtime**: Bun (preferred for dev and production)
- **Database**: SQLite via Prisma ORM
- **UI**: React 19, Tailwind CSS 4, shadcn/ui components, Radix UI primitives
- **State**: Zustand for global app state (view routing, cart, auth)
- **Styling**: Custom "Benjamin" design system with background images and branded colors

## Development Commands

```bash
# Development server (port 3000)
bun run dev

# Build for production (creates standalone output)
bun run build

# Production server
bun run start

# Linting
bun run lint

# Database operations
bun run db:push        # Push schema to database
bun run db:generate    # Generate Prisma client
bun run db:migrate     # Run migrations
bun run db:reset       # Reset database
```

## Architecture

### Single-Page Application Pattern

The app uses client-side view routing instead of Next.js file-based routing:
- All views render through a single `/` route via `src/app/page.tsx`
- `AppShell` component (`src/components/site/app-shell.tsx`) coordinates view rendering
- View state managed by Zustand store (`src/lib/store.ts`) with `view` property
- View types: home, search, product, supplier, manufacturers, cart, checkout, rfq, ranking, dropshipping, auth, buyer-dashboard, supplier-dashboard, admin, help, chat

### Database Schema

Prisma schema mirrors Alibaba's B2B structure:
- **Core entities**: User, Supplier, Category (tree), Product, PriceTier
- **Shopping flow**: Cart, CartItem, Order, OrderItem
- **B2B features**: RFQ (Request for Quote), Quote, Review, Payout
- **Communication**: Conversation, Message
- **Supporting**: Banner, Favorite, Address

Categories use self-referential tree structure (`parentId`/`children`). Products have JSON fields for flexibility (images, certifications, keyAttributes, variantsJson).

### API Routes

API routes in `src/app/api/` organized by resource:
- `/api/banners` - Banner management
- `/api/categories` - Category CRUD
- `/api/products` - Product search, detail, CRUD
- `/api/suppliers` - Supplier listing and management
- `/api/rfq` - Request for Quote handling
- `/api/search` - Product search with filters

All routes return JSON and use Prisma client via `src/lib/db.ts`.

### Component Structure

```
src/components/
├── site/           # Main view components (one per view key)
│   ├── app-shell.tsx      # Main coordinator
│   ├── home-view.tsx
│   ├── search-view.tsx
│   ├── product-detail-view.tsx
│   ├── cart-view.tsx
│   ├── checkout-view.tsx
│   ├── header.tsx         # Site-wide header
│   ├── footer.tsx         # Site-wide footer
│   └── ...
└── ui/             # shadcn/ui components (button, dialog, etc.)
```

### State Management

`src/lib/store.ts` exports `useApp` hook with:
- View routing: `view`, `setView`
- Navigation context: `productId`, `supplierId`, `categoryId`, `searchQuery`
- Shopping cart: `cart`, `addToCart`, `removeFromCart`, `updateQty`, `clearCart`
- User auth: `user`, `signIn`, `signOut` (client-side mocked)
- Favorites: `favorites`, `toggleFavorite`
- Search filters: `filters`, `setFilter`, `resetFilters`
- i18n: `currency`, `lang`

### Data Serialization

`src/lib/serialize.ts` contains server-side data fetching functions:
- `getCategories()` - Returns category tree with product counts
- Used in page components to fetch initial data

## Environment Variables

`.env.local` file required (takes precedence over `.env`):
```
DATABASE_URL=file:/home/serge/Téléchargements/ecom-benj/db/custom.db
```

**Important**: Use absolute path for SQLite database to avoid path resolution issues with Next.js/Turbopack.

## Database Seeding

`prisma/seed.ts` populates the database with:
- Category tree (Electronics, Machinery, Home & Garden, etc.)
- Sample suppliers (Chinese manufacturers)
- Products with realistic pricing tiers
- Banners for home page

Run migrations to seed: `bun run db:migrate`

## Build Configuration

- `output: "standalone"` - Creates self-contained production bundle
- `typescript.ignoreBuildErrors: true` - Allows builds despite TS errors
- `reactStrictMode: false` - Disabled for performance
- Build copies static assets to standalone output for deployment

## Styling Conventions

Custom design system with:
- `.benjamin-bg` - Main background pattern
- `.benjamin-column` - Content column wrapper
- Color palette uses warm oranges (#FF6700) and neutral grays
- Mobile-first responsive design with md/lg breakpoints