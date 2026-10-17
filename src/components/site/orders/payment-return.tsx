"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useApp } from "@/lib/store";
import { apiFetch } from "@/lib/api-client";

type PaymentStatus = { payment: { id: string; status: string }; orders: { ref: string }[] };

const ID = /^[A-Za-z0-9_-]{10,40}$/;

/**
 * Back from the payment provider (`/?payment=<id>`): the server re-checks the
 * transaction with the provider (does not rely on the webhook alone), then the
 * buyer lands on their orders with a clear message.
 */
export function PaymentReturn() {
  const authStatus = useApp((s) => s.authStatus);
  const pending = useRef<string | null>(null);

  // Read and strip the param once, so a reload does not re-run the flow.
  useEffect(() => {
    const url = new URL(window.location.href);
    const id = url.searchParams.get("payment");
    if (!id) return;
    url.searchParams.delete("payment");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    if (ID.test(id)) pending.current = id;
  }, []);

  useEffect(() => {
    const id = pending.current;
    if (!id || authStatus === "loading") return;
    pending.current = null;
    if (authStatus !== "authenticated") {
      toast.message("Connectez-vous pour voir le statut de votre paiement.");
      return;
    }

    let cancelled = false;
    let done = false;
    const toastId = toast.loading("Vérification du paiement…");
    (async () => {
      let last: PaymentStatus | null = null;
      for (let i = 0; i < 6 && !cancelled; i++) {
        try {
          last = await apiFetch<PaymentStatus>(`/api/payments/${encodeURIComponent(id)}`);
          if (last.payment.status !== "pending") break;
        } catch {
          /* transient: retry */
        }
        await new Promise((r) => setTimeout(r, 2500));
      }
      if (cancelled) return;
      const refs = last?.orders.map((o) => o.ref).join(", ") ?? "";
      const status = last?.payment.status;
      if (status === "paid") toast.success(`Paiement reçu. Commande ${refs} transmise à la boutique.`, { id: toastId });
      else if (status === "failed" || status === "cancelled") toast.error(`Paiement non abouti : la commande ${refs} a été annulée.`, { id: toastId });
      else toast.message("Paiement en cours de confirmation. Le statut se mettra à jour dans « Mes commandes ».", { id: toastId });
      done = true;
      useApp.getState().openDashboard("buyer-dashboard", "orders");
    })();
    return () => {
      cancelled = true;
      if (!done) {
        toast.dismiss(toastId);
        pending.current = id; // interrupted (re-render): resume on the next run
      }
    };
  }, [authStatus]);

  return null;
}
