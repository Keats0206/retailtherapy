"use client";

import { useEffect, useRef, useState } from "react";

import { useParticipants } from "@/lib/live";
import type { ChatLine } from "@/lib/chat-state";

const MAX_JOIN_LINES = 30;

/**
 * Arrivals, as chat lines. Identities come from LiveKit, but the design-mode
 * room has none — so an unnamed room falls back to counting the difference,
 * which is enough to make an empty rail visibly fill up.
 */
export function useViewerJoins(): ChatLine[] {
  const participants = useParticipants();
  const [joins, setJoins] = useState<ChatLine[]>([]);
  const seen = useRef<Set<string>>(new Set());
  const anonCount = useRef(0);

  useEffect(() => {
    const viewers = participants.filter((p) => !p.permissions?.canPublish);
    const named = viewers.filter((p) => p.identity);
    const next: ChatLine[] = [];
    const at = Date.now();

    for (const viewer of named) {
      const identity = viewer.identity!;
      if (seen.current.has(identity)) continue;
      seen.current.add(identity);
      next.push({
        id: `join:${identity}`,
        timestamp: at,
        message: `${viewer.name || "Someone"} joined`,
        kind: "system",
      });
    }

    const anonymous = viewers.length - named.length;
    for (let i = anonCount.current; i < anonymous; i += 1) {
      next.push({
        id: `join:anon:${i}`,
        timestamp: at,
        message: "A viewer joined",
        kind: "system",
      });
    }
    anonCount.current = Math.max(anonymous, 0);

    if (next.length === 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setJoins((prev) => [...prev, ...next].slice(-MAX_JOIN_LINES));
  }, [participants]);

  return joins;
}
