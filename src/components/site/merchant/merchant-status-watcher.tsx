"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useApp } from "@/lib/store";

/** Announces a merchant approval detected after a profile refresh, wherever the user is. */
export function MerchantStatusWatcher() {
  const status = useApp((s) => s.user?.supplier?.status ?? null);
  const userId = useApp((s) => s.user?.id ?? null);
  const prev = useRef<{ userId: string | null; status: string | null }>({ userId, status });

  useEffect(() => {
    const before = prev.current;
    if (before.userId === userId && before.status && before.status !== "approved" && status === "approved") {
      toast.success("Votre boutique est validée !", {
        description: "Vous pouvez maintenant publier vos produits.",
        action: { label: "Mon espace", onClick: () => useApp.getState().setView("supplier-dashboard") },
      });
    }
    prev.current = { userId, status };
  }, [status, userId]);

  return null;
}
