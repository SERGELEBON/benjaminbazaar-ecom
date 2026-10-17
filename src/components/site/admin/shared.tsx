"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

export const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";
export const fmtDateTime = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

export const ROLE_LABEL: Record<string, string> = { BUYER: "Client", SUPPLIER: "Marchand", ADMIN: "Admin" };
export const SHOP_STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  approved: "Validée",
  rejected: "Refusée",
  suspended: "Suspendue",
};

export { apiFetch as adminFetch, jsonInit } from "@/lib/api-client";


/** Re-runs `load` when the admin comes back to the tab and every `ms` while visible. */
export function useAutoRefresh(load: () => void, ms = 30_000) {
  const ref = useRef(load);
  useEffect(() => {
    ref.current = load;
  });
  useEffect(() => {
    const run = () => document.visibilityState === "visible" && ref.current();
    const t = setInterval(run, ms);
    window.addEventListener("focus", run);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", run);
    };
  }, [ms]);
}

export function Pill({ tone, children }: { tone: "green" | "orange" | "red" | "grey" | "blue" | "navy"; children: React.ReactNode }) {
  const map = {
    green: "bg-[#16A34A]",
    orange: "bg-[#FF6A00]",
    red: "bg-[#DC2626]",
    grey: "bg-[#6B7280]",
    blue: "bg-[#337AB7]",
    navy: "bg-[#0A0F4D]",
  };
  return (
    <span className={`${map[tone]} text-white text-[10px] font-bold uppercase px-2 py-0.5 tracking-wide whitespace-nowrap`}>
      {children}
    </span>
  );
}

export const shopTone = (s: string) =>
  (({ pending: "orange", approved: "green", rejected: "red", suspended: "grey" }) as const)[s as "pending"] ?? "grey";

export function SkeletonRows({ n = 4 }: { n?: number }) {
  return (
    <div className="p-4 space-y-2" aria-busy>
      {[...Array(n)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 border-b border-[#ECECEC]">
          <div className="w-9 h-9 bg-[#ECECEC] animate-pulse" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-[#ECECEC] animate-pulse w-1/2" />
            <div className="h-2.5 bg-[#ECECEC] animate-pulse w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Small modal asking for a reason (rejection / suspension) or a confirmation. */
export function ReasonDialog({
  title,
  description,
  confirmLabel,
  tone = "red",
  requireReason = true,
  placeholder,
  onConfirm,
  onClose,
}: {
  title: string;
  description?: string;
  confirmLabel: string;
  tone?: "red" | "green" | "navy";
  requireReason?: boolean;
  placeholder?: string;
  onConfirm: (reason: string) => Promise<void>;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const btn = { red: "bg-[#DC2626]", green: "bg-[#16A34A]", navy: "bg-[#0A0F4D]" }[tone];
  return (
    <div className="fixed inset-0 z-[120] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="bg-white w-full sm:max-w-md p-5 border border-[#DADAD9]">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-[16px] font-extrabold">{title}</h3>
          <button onClick={onClose} disabled={busy} aria-label="Fermer" className="p-1 text-[#666]"><X className="w-4 h-4" /></button>
        </div>
        {description && <p className="text-[13px] text-[#555] mt-1.5">{description}</p>}
        {(requireReason || placeholder) && (
          <textarea
            autoFocus
            rows={4}
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={placeholder ?? "Motif communiqué au marchand…"}
            className="mt-3 w-full border border-[#DADAD9] px-3 py-2 text-[13px] outline-none focus:border-[#1A1F8A] resize-none"
          />
        )}
        {error && <p role="alert" className="text-[12px] text-[#B91C1C] mt-2">{error}</p>}
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} disabled={busy} className="btn-outline-grey flex-1">Annuler</button>
          <button
            disabled={busy || (requireReason && reason.trim().length < 5)}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                await onConfirm(reason.trim());
                onClose();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
            className={`${btn} text-white text-[12px] font-bold uppercase flex-1 py-2.5 disabled:opacity-50`}
          >
            {busy ? "…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
