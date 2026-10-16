"use client";

/**
 * Realtime "nudges" for the chat, on Supabase Realtime Broadcast.
 *
 * Nothing confidential travels over these channels: a nudge only says "something
 * changed in conversation X" (or "the other side is typing"). On a nudge the client
 * refetches through our authenticated API, which enforces who may read what. If
 * Realtime is unavailable, the UI keeps working through periodic polling.
 */
import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "@/lib/supabase/client";

export type ChatNudge =
  | { type: "message"; conversationId: string }
  | { type: "read"; conversationId: string }
  | { type: "typing"; conversationId: string; side: "buyer" | "supplier"; typing: boolean };

const EVENT = "nudge";

/** Channels this tab is currently subscribed to (reused for sending). */
const active = new Map<string, RealtimeChannel>();

/** Subscribes to a set of channels; `onNudge` always sees the latest closure. */
export function useNudges(channels: string[], onNudge: (n: ChatNudge, channel: string) => void) {
  const handler = useRef(onNudge);
  useEffect(() => {
    handler.current = onNudge;
  });
  const key = [...new Set(channels)].sort().join("|");

  useEffect(() => {
    if (!key) return;
    let supabase: ReturnType<typeof getSupabaseBrowser>;
    try {
      supabase = getSupabaseBrowser();
    } catch {
      return; // Supabase not configured: polling only
    }
    const names = key.split("|").filter((n) => !active.has(n));
    const subs: RealtimeChannel[] = names.map((name) => {
      const ch = supabase
        .channel(name, { config: { broadcast: { self: false } } })
        .on("broadcast", { event: EVENT }, ({ payload }) => handler.current(payload as ChatNudge, name))
        .subscribe();
      active.set(name, ch);
      return ch;
    });
    return () => {
      subs.forEach((c, i) => {
        active.delete(names[i]);
        void supabase.removeChannel(c);
      });
    };
  }, [key]);
}

/** Fire-and-forget nudge to one or more channels (short-lived sender channels). */
export async function sendNudge(channels: string[], nudge: ChatNudge) {
  let supabase: ReturnType<typeof getSupabaseBrowser>;
  try {
    supabase = getSupabaseBrowser();
  } catch {
    return;
  }
  await Promise.all(
    [...new Set(channels)].map(
      (name) =>
        new Promise<void>((resolve) => {
          const existing = active.get(name);
          if (existing) {
            void existing.send({ type: "broadcast", event: EVENT, payload: nudge }).finally(resolve);
            return;
          }
          const ch = supabase.channel(name, { config: { broadcast: { self: false, ack: false } } });
          const done = () => {
            void supabase.removeChannel(ch);
            resolve();
          };
          const timer = setTimeout(done, 4000);
          ch.subscribe((status) => {
            if (status === "SUBSCRIBED") {
              void ch.send({ type: "broadcast", event: EVENT, payload: nudge }).finally(() => {
                clearTimeout(timer);
                done();
              });
            } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
              clearTimeout(timer);
              done();
            }
          });
        }),
    ),
  );
}
