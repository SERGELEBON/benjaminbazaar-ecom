"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, LayoutDashboard, LogOut, User } from "lucide-react";
import { toast } from "sonner";
import { homeViewForRole, useApp } from "@/lib/store";

const ROLE_LABEL = { BUYER: "Client", SUPPLIER: "Marchand", ADMIN: "Administrateur" } as const;

function initials(name: string | null, email: string) {
  const src = (name ?? email).trim();
  const parts = src.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || src[0]?.toUpperCase() || "?";
}

export function Avatar({ size = 28 }: { size?: number }) {
  const user = useApp((s) => s.user);
  if (!user) return null;
  return user.avatarUrl ? (
    <img src={user.avatarUrl} alt="" width={size} height={size} referrerPolicy="no-referrer" className="rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="rounded-full bg-[#1A1F8A] text-white font-bold flex items-center justify-center" style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {initials(user.name, user.email)}
    </span>
  );
}

/** Header account area: sign-in buttons for guests, account dropdown for signed-in users. */
export function AccountMenu({ compact = false }: { compact?: boolean }) {
  const { authStatus, user, setView, setAuthMode, signOut } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  const goAuth = (mode: "login" | "signup") => { setAuthMode(mode); setView("auth"); };

  if (authStatus === "loading") {
    return <span className={`${compact ? "w-8 h-8" : "w-24 h-8"} bg-[#ECECEC] animate-pulse rounded-full`} aria-hidden />;
  }

  if (!user) {
    if (compact) {
      return (
        <button className="p-1.5" onClick={() => goAuth("login")} aria-label="Se connecter">
          <User className="w-6 h-6" strokeWidth={1.6} />
        </button>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <button onClick={() => goAuth("login")} className="flex items-center gap-1 px-2 hover:text-[#FF6A00] whitespace-nowrap">
          <User className="w-5 h-5" strokeWidth={1.6} />
          <span className="text-[12px] font-semibold hidden xl:inline">Se connecter</span>
        </button>
        <button onClick={() => goAuth("signup")} className="btn-square-black whitespace-nowrap">Créer un compte</button>
      </div>
    );
  }

  const firstName = (user.name ?? user.email).split(/[\s@]/)[0];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 px-1.5 py-1 hover:bg-[#F5F5F5]"
      >
        <Avatar size={compact ? 30 : 28} />
        {!compact && (
          <>
            <span className="text-left leading-tight hidden lg:block">
              <span className="block text-[12px] font-semibold max-w-[110px] truncate">{firstName}</span>
              <span className="block text-[9px] uppercase text-[#888]">{ROLE_LABEL[user.role]}</span>
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[#888]" />
          </>
        )}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full mt-1 w-60 bg-white border border-[#DADAD9] shadow-lg z-[80]">
          <div className="px-4 py-3 border-b border-[#ECECEC]">
            <div className="text-[13px] font-bold truncate">{user.name ?? firstName}</div>
            <div className="text-[11px] text-[#888] truncate">{user.email}</div>
            <div className="text-[10px] uppercase font-bold text-[#1A1F8A] mt-1">
              {ROLE_LABEL[user.role]}
              {user.role === "SUPPLIER" && user.supplier?.status === "pending" && <span className="text-[#FF6A00]"> · en validation</span>}
            </div>
          </div>
          <button role="menuitem" onClick={() => { setOpen(false); setView(homeViewForRole(user.role)); }}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] hover:bg-[#F5F5F5] text-left">
            <LayoutDashboard className="w-4 h-4 text-[#1A1F8A]" /> Mon espace
          </button>
          {user.role === "ADMIN" && (
            <button role="menuitem" onClick={() => { setOpen(false); setView("buyer-dashboard"); }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] hover:bg-[#F5F5F5] text-left">
              <User className="w-4 h-4 text-[#1A1F8A]" /> Mes achats
            </button>
          )}
          <button role="menuitem" onClick={async () => { setOpen(false); await signOut(); toast.success("Vous êtes déconnecté."); }}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] hover:bg-[#F5F5F5] text-left border-t border-[#ECECEC] text-[#B91C1C]">
            <LogOut className="w-4 h-4" /> Déconnexion
          </button>
        </div>
      )}
    </div>
  );
}
