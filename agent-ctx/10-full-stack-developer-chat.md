# Task 10 — Real-time chat (full-stack-developer)

## Deliverables completed

### 1. Mini-service `mini-services/chat-service/`
- `package.json` — name `aelf-bazaar-chat`, deps `socket.io`, devDeps `tsx` + `@types/node`, scripts `"dev": "bun --hot index.ts"`.
- `index.ts` — Socket.io server on hardcoded port **3004**, `path: "/"`, CORS `origin:"*"`, methods `["GET","POST"]`. Seeded 4 conversations (Shenzhen Lingtong Tech, Accra Agro Foods, Istanbul Leather Works, Nairobi Solar Energy — matching seed data supplier names) with starter messages.
- Events handled:
  - `conversation:list` → emits `conversations:list` with full list payload (id, supplier info, lastMessage preview, unread, productId, etc.).
  - `conversation:join` → joins `conv:{id}` room, emits `conversation:history`, clears unread.
  - `message:send` → stores message, emits `message:new` to room, refreshes list, then triggers auto-responder after 1.5–3.5s (with typing indicator).
  - `typing:start` / `typing:stop` → broadcast `typing:update` to room (excluding sender).
- Auto-responder covers FR + EN keywords: price/prix/devis, MOQ/minimum/quantité, shipping/livraison/délai, sample/échantillon, custom/personnalis/logo, payment/paiement, quality/certif, bonjour/salut, merci/thank, réduction/discount, délai de production. Plus 1-in-4 chance generic probe "Auriez-vous une photo ou une référence du produit souhaité ?".
- Graceful `SIGTERM`/`SIGINT` handlers + force-exit timeout fallback.
- Health-check HTTP handler on `/` and `/health` (returns JSON `{ok, service, port}` for plain HTTP requests without socket.io params).
- Started via `setsid -f bun index.ts` — properly daemonized (parent PID 1), survives shell exit.
- Verified running: `curl "http://localhost:3004/?EIO=4&transport=polling"` returns socket.io session JSON `0{"sid":...,"upgrades":["websocket"],...}`.

### 2. `src/components/site/chat-view.tsx` — `export function ChatView()`
`"use client"` component. Three-panel layout:
- **Left panel** (~300px): `.aelf-bar` "MESSAGERIE", search input filters by supplier name, conversation list with avatar/name/last-message preview/timestamp/unread badge (orange), active item highlighted with orange left border + light orange background, "Nouvelle conversation" `.btn-aelf-orange` button at bottom.
- **Center panel** (flex-1): top bar with supplier avatar, name, Verified badge, "● En ligne" with green dot, city/country, phone/video/info action icons (UI only). Product context strip below top bar if a product is linked. Messages area (`.aelf-scroll`) with:
  - Buyer messages right-aligned, orange `#FF6A00` bg, white text.
  - Supplier messages left-aligned, white bg, grey `#DADAD9` border, dark text.
  - Supplier avatar shown next to first message in a group (consecutive supplier messages share one avatar).
  - Date separators ("Aujourd'hui", "Hier", full date) between message groups.
  - Auto-scroll to bottom on new message.
  - Typing indicator with 3 animated bouncing dots in a grey bubble when supplier is "typing".
  - Bottom input bar: textarea (auto-growing, Enter to send, Shift+Enter for newline), paperclip + smile (UI only), send `.btn-aelf-orange` button with paper-plane icon.
- **Right panel** (~260px, hidden on mobile): supplier mini-card (logo, name, Verified badge, city/country, store rating, response time), "Vérification fournisseur" `.btn-outline-grey`, quick-reply chips that send instantly ("Quel est le prix ?", "Quelle est la quantité minimum ?", "Délai de livraison ?", "Puis-je avoir un échantillon ?"), linked product card with "Voir produit" button (jumps to product detail), bottom "Conseil AELF" tip card.
- **Mobile**: single panel state (`mobilePanel: "list" | "chat"`), back arrow on chat top bar to return to list.
- **Socket lifecycle**: connects on mount via `io("/?XTransformPort=3004", {transports: ["websocket","polling"], reconnection: true})`. Uses `activeIdRef` to read latest state inside socket callbacks without re-subscribing on every activeId change. Handles `connect`, `disconnect`, `connect_error`, `reconnect_attempt`, `reconnect` events. Reconnect re-emits `conversation:list` and re-joins active conversation. Banner at top shows "Reconnexion…" (orange) when reconnecting, "Déconnecté" (red) when fully disconnected.
- **Skeletons**: 4 row placeholders in conversation list while loading, 4 message bubble placeholders while loading history.
- **Auto-select**: when `chatSupplierId` is set in store (from any "Chat now" button), auto-selects the matching conversation on next list refresh.

### 3. Wired all "Chat now" / "Chat" buttons
- `src/lib/store.ts` — added `chatSupplierId`, `chatProductId` state + setters.
- `src/lib/format.ts` — added `"chat"` to `ViewKey` union.
- `src/components/site/app-shell.tsx` — imported `ChatView`, added `{view === "chat" && <ChatView />}`.
- `src/components/site/product-detail-view.tsx` — both "Chat now" buttons (desktop right column + mobile sticky bottom bar) → set `chatSupplierId(product.supplierId)`, `chatProductId(product.id)`, `setView("chat")`.
- `src/components/site/search-view.tsx` — "Chat now" under each product card → `useApp.getState().setChatSupplierId(p.supplierId)`, `setChatProductId(p.id)`, `setView("chat")`.
- `src/components/site/supplier-view.tsx` — "Chat now" button → `setChatSupplierId(supplier.id)`, `setView("chat")`.
- `src/components/site/manufacturers-view.tsx` — "Chat now" on each supplier card → `setChatSupplierId(s.id)`, `setView("chat")`. (Also removed unused `toast` import.)
- `src/components/site/cart-view.tsx` — "Chat" button in supplier group header → `setChatSupplierId(g.supplierId)`, `setView("chat")`.
- `src/components/site/ranking-view.tsx` — "Chat" button in ranked table → `setChatSupplierId(p.supplierId)`, `setView("chat")`.
- `src/components/site/right-toolbar.tsx` — "MESSAGES" toolbar item → `setView("chat")`.
- `src/components/site/help-view.tsx` — "Chat now" in "Still need help?" panel → clears chat context, `setView("chat")`.

## Lint / type status
- `bunx eslint` on all 12 modified files: **0 errors, 0 warnings**.
- `bun run lint` (project-wide): **clean exit 0**.
- `bunx tsc --noEmit`: chat-view.tsx passes. Two pre-existing errors remain in `cart-view.tsx:133` (the `setSupplierId() || setView(...)` void-truthy test pattern from a previous agent) and `product-detail-view.tsx:323,785` (`product.type` access — `type` isn't on `ProductT`). Both are out of scope for this task and were not introduced here; verified via `git diff HEAD`.

## Service verification
- Chat service running on port 3004, PID 3363, parent PID 1 (properly daemonized with `setsid -f`).
- Caddy gateway at port 81 correctly routes `?XTransformPort=3004` → port 3004, returning socket.io session JSON.
- Direct socket.io polling test: `curl "http://localhost:3004/?EIO=4&transport=polling"` → `0{"sid":"...","upgrades":["websocket"],...}`.

## Notes for future agents
- The chat service is **in-memory only** — conversations reset when the service restarts. The Next.js dev.sh auto-discovery picks up `mini-services/chat-service/package.json` and runs `bun run dev` on next dev restart, so it auto-starts with the rest of the platform.
- The socket connection uses `io("/?XTransformPort=3004", ...)` — relative path with the port passed as a query param per the gateway convention.
- All Chat now buttons now set the `chatSupplierId` (and `chatProductId` where available) before navigating to `view === "chat"`, so the chat view auto-opens the right conversation. If no supplier context is set (e.g. from the MESSAGES toolbar item), the conversation list is shown and the user picks.
- The auto-responder replies in French (matching the project's default `lang: "fr"` and Côte d'Ivoire theme).
