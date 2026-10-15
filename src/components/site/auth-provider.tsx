"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { homeViewForRole, useApp } from "@/lib/store";

/**
 * Keeps the client session in sync with the server:
 * - loads the profile on start (/api/me)
 * - reacts to Supabase auth events (sign in / out / token refresh in another tab)
 * - handles the redirect from /auth/callback (?auth=signed-in|reset|error|suspended)
 */
export function AuthProvider() {
  const refreshSession = useApp((s) => s.refreshSession);
  const setSession = useApp((s) => s.setSession);

  useEffect(() => {
    const url = new URL(window.location.href);
    const authParam = url.searchParams.get("auth");
    const hashError = new URLSearchParams(url.hash.replace(/^#/, "")).get("error_description");
    if (authParam || hashError) {
      url.searchParams.delete("auth");
      window.history.replaceState(null, "", url.pathname + url.search);
    }

    refreshSession().then((user) => {
      const { setView, setAuthMode } = useApp.getState();
      if (hashError) {
        toast.error("Lien invalide ou expiré. Veuillez recommencer.");
        setAuthMode("login");
        setView("auth");
      } else if (authParam === "reset" && user) {
        setAuthMode("reset");
        setView("auth");
      } else if (authParam === "signed-in" && user) {
        toast.success(`Bienvenue ${user.name ?? ""} !`);
        setView(homeViewForRole(user.role));
      } else if (authParam === "suspended") {
        toast.error("Ce compte est suspendu. Contactez le support.");
      } else if (authParam === "error") {
        toast.error("La connexion a échoué. Veuillez réessayer.");
        setAuthMode("login");
        setView("auth");
      }
    });

    const { data } = getSupabaseBrowser().auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") setSession(null);
      else if (event === "SIGNED_IN" || event === "USER_UPDATED") void refreshSession();
    });
    return () => data.subscription.unsubscribe();
  }, [refreshSession, setSession]);

  return null;
}
