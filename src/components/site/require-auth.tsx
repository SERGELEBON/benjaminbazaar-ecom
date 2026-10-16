"use client";

import type { ReactNode } from "react";
import { Loader2, Lock, ShieldAlert } from "lucide-react";
import { homeViewForRole, useApp, type Role } from "@/lib/store";
import { BecomeMerchant, MerchantStatusPanel } from "./merchant/merchant-onboarding";

/** UI guard for protected views. The server enforces the same rules on every API call. */
export function RequireAuth({ roles, children, requireApprovedSupplier = false }: {
  roles?: Role[];
  children: ReactNode;
  /** Merchant space: clients get the "Devenir vendeur" form, non-approved merchants their status page. */
  requireApprovedSupplier?: boolean;
}) {
  const { authStatus, user, setView, setAuthMode } = useApp();

  if (authStatus === "loading") {
    return (
      <Shell>
        <Loader2 className="w-8 h-8 mx-auto text-[#1A1F8A] animate-spin" />
        <p className="text-[13px] text-[#666] mt-3">Chargement de votre espace…</p>
      </Shell>
    );
  }

  if (!user) {
    return (
      <Shell>
        <Lock className="w-10 h-10 mx-auto text-[#FF6A00]" />
        <h2 className="text-[18px] font-bold mt-3">Connexion requise</h2>
        <p className="text-[13px] text-[#666] mt-1.5">Connectez-vous ou créez un compte pour accéder à cet espace.</p>
        <div className="grid grid-cols-2 gap-2 mt-5">
          <button onClick={() => { setAuthMode("login"); setView("auth"); }} className="btn-square-black">Se connecter</button>
          <button onClick={() => { setAuthMode("signup"); setView("auth"); }} className="btn-benjamin-orange">Créer un compte</button>
        </div>
      </Shell>
    );
  }

  if (requireApprovedSupplier && user.role !== "ADMIN") {
    if (user.role === "BUYER" || !user.supplier) return <BecomeMerchant />;
    if (user.supplier.status !== "approved") return <MerchantStatusPanel user={user} />;
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <Shell>
        <ShieldAlert className="w-10 h-10 mx-auto text-[#FF6A00]" />
        <h2 className="text-[18px] font-bold mt-3">Accès refusé</h2>
        <p className="text-[13px] text-[#666] mt-1.5">Votre compte n&apos;a pas accès à cet espace.</p>
        <button onClick={() => setView(homeViewForRole(user.role))} className="btn-square-black mt-5 w-full">
          Aller à mon espace
        </button>
      </Shell>
    );
  }

  return <>{children}</>;
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="bg-[#ECECEC] min-h-[70vh] flex items-center justify-center px-4 py-10">
      <div className="bg-white border border-[#DADAD9] max-w-md w-full p-8 text-center">{children}</div>
    </div>
  );
}
