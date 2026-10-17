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
  const userId = useApp((s) => s.user?.id ?? null);

  // Account data (favorites) follows the signed-in user.
  useEffect(() => {
    if (!userId) return;
    const t = setTimeout(() => void useApp.getState().loadFavorites(), 0);
    return () => clearTimeout(t);
  }, [userId]);

  // Restore the saved cart once on the client (localStorage may be unavailable).
  useEffect(() => {
    try {
      void useApp.persist.rehydrate();
    } catch {
      /* private mode: cart stays in memory */
    }
  }, []);

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
    // Role / merchant status / suspension can change on the server (admin action):
    // re-read the profile when the user comes back to the tab (throttled).
    let last = Date.now();
    const onReturn = () => {
      if (document.visibilityState !== "visible" || Date.now() - last < 15_000) return;
      last = Date.now();
      if (useApp.getState().authStatus === "authenticated") void refreshSession();
    };
    window.addEventListener("focus", onReturn);
    document.addEventListener("visibilitychange", onReturn);

    return () => {
      data.subscription.unsubscribe();
      window.removeEventListener("focus", onReturn);
      document.removeEventListener("visibilitychange", onReturn);
    };
  }, [refreshSession, setSession]);

  return null;
}
