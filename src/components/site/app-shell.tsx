"use client";

import { useApp } from "@/lib/store";
import type { CategoryNode } from "@/lib/format";
import { Header } from "./header";
import { Footer } from "./footer";
import { RightToolbar } from "./right-toolbar";
import { WhatsAppButton } from "./whatsapp-button";
import { HomeView } from "./home-view";
import { SearchView } from "./search-view";
import { ProductDetailView } from "./product-detail-view";
import { SupplierView } from "./supplier-view";
import { ManufacturersView } from "./manufacturers-view";
import { CartView } from "./cart-view";
import { CheckoutView } from "./checkout-view";
import { RfqView } from "./rfq-view";
import { RankingView } from "./ranking-view";
import { DropshippingView } from "./dropshipping-view";
import { AuthView } from "./auth-view";
import { BuyerDashboard } from "./buyer-dashboard";
import { SupplierDashboard } from "./supplier-dashboard";
import { AdminView } from "./admin-view";
import { HelpView } from "./help-view";
import { ChatView } from "./chat-view";
import { AuthProvider } from "./auth-provider";
import { RequireAuth } from "./require-auth";
import { ChatUnreadWatcher } from "./chat/chat-unread-watcher";
import { MerchantStatusWatcher } from "./merchant/merchant-status-watcher";
import { Toaster } from "sonner";

export function AppShell({ categories }: { categories: CategoryNode[] }) {
  const view = useApp((s) => s.view);

  return (
    <div className="benjamin-bg min-h-screen flex flex-col">
      <div className="benjamin-column flex-1 flex flex-col w-full max-w-[1280px] mx-auto md:my-4 md:border-x md:border-[#DADAD9]">
        <Header categories={categories} />

        <main className="flex-1 flex flex-col">
          {view === "home" && <HomeView categories={categories} />}
          {view === "search" && <SearchView categories={categories} />}
          {view === "product" && <ProductDetailView />}
          {view === "supplier" && <SupplierView />}
          {view === "manufacturers" && <ManufacturersView />}
          {view === "cart" && <CartView />}
          {view === "checkout" && <RequireAuth><CheckoutView /></RequireAuth>}
          {view === "rfq" && <RfqView />}
          {view === "ranking" && <RankingView categories={categories} />}
          {view === "dropshipping" && <DropshippingView />}
          {view === "auth" && <AuthView />}
          {view === "buyer-dashboard" && <RequireAuth><BuyerDashboard /></RequireAuth>}
          {view === "supplier-dashboard" && <RequireAuth roles={["SUPPLIER", "ADMIN"]} requireApprovedSupplier><SupplierDashboard /></RequireAuth>}
          {view === "admin" && <RequireAuth roles={["ADMIN"]}><AdminView /></RequireAuth>}
          {view === "help" && <HelpView />}
          {view === "chat" && <RequireAuth><ChatView /></RequireAuth>}
        </main>

        <Footer />
      </div>

      <AuthProvider />
      <ChatUnreadWatcher />
      <MerchantStatusWatcher />
      <Toaster position="top-center" richColors closeButton />
      <RightToolbar />
      <WhatsAppButton />
    </div>
  );
}
