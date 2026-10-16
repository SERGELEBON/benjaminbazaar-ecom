"use client";

import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { useNudges } from "@/lib/chat-realtime";

/**
 * Keeps the header "Messages" badge up to date for signed-in users:
 * realtime nudges on the user's inbox channels + a slow polling fallback.
 */
export function ChatUnreadWatcher() {
  const authStatus = useApp((s) => s.authStatus);
  const userId = useApp((s) => s.user?.id);
  const view = useApp((s) => s.view);
  const [channels, setChannels] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/chat/unread", { cache: "no-store", credentials: "same-origin" });
      if (!r.ok) return;
      const d = (await r.json()) as { unread?: number; channels?: string[] };
      useApp.setState({ chatUnread: Math.max(0, Number(d.unread) || 0) });
      setChannels(Array.isArray(d.channels) ? d.channels : []);
    } catch {
      /* offline */
    }
  }, []);

  useEffect(() => {
    if (authStatus !== "authenticated") {
      useApp.setState({ chatUnread: 0 });
      return;
    }
    const first = setTimeout(() => void refresh(), 0);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 60_000);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [authStatus, userId, refresh]);

  // The chat view manages its own subscriptions and badge while it is open.
  useNudges(authStatus === "authenticated" && view !== "chat" ? channels : [], () => void refresh());

  return null;
}
