"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ConnectionState } from "livekit-client";

import { useConnectionState, useDataChannel } from "@/lib/live";

import { getVoterDisplayName } from "@/lib/voter-identity";

/**
 * Quick emoji reactions over the LiveKit data channel.
 * Viewers tap; the host sees them float on the stage.
 */

export const REACTION_EMOJIS = ["❤️", "🔥", "👏", "🛍️"] as const;

export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

export interface ReactionBurst {
  id: string;
  emoji: ReactionEmoji;
  displayName: string;
  at: number;
}

const TOPIC = "reaction";
const MAX_VISIBLE = 12;
const TTL_MS = 4_000;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

type ReactionEvent = {
  t: "reaction";
  emoji: ReactionEmoji;
  displayName: string;
  at: number;
};

export function useReactionState({ isHost }: { isHost: boolean }) {
  const [bursts, setBursts] = useState<ReactionBurst[]>([]);
  const sendRef = useRef<((event: ReactionEvent) => void) | null>(null);

  const pushBurst = useCallback((event: ReactionEvent) => {
    const burst: ReactionBurst = {
      id: `${event.at}-${Math.random().toString(36).slice(2, 7)}`,
      emoji: event.emoji,
      displayName: event.displayName,
      at: event.at,
    };
    setBursts((prev) => [...prev.slice(-(MAX_VISIBLE - 1)), burst]);
  }, []);

  const handleMessage = useCallback(
    (raw: { payload: Uint8Array }) => {
      let event: ReactionEvent;
      try {
        event = JSON.parse(decoder.decode(raw.payload)) as ReactionEvent;
      } catch {
        return;
      }
      if (event.t !== "reaction") return;
      if (isHost) pushBurst(event);
    },
    [isHost, pushBurst],
  );

  const { send } = useDataChannel(TOPIC, handleMessage);
  const connectionState = useConnectionState();
  const connected = connectionState === ConnectionState.Connected;

  useEffect(() => {
    if (!connected || isHost) {
      sendRef.current = null;
      return;
    }
    sendRef.current = (event: ReactionEvent) => {
      send(encoder.encode(JSON.stringify(event)), { reliable: false }).catch(
        () => {},
      );
    };
    return () => {
      sendRef.current = null;
    };
  }, [send, connected, isHost]);

  useEffect(() => {
    if (bursts.length === 0) return;
    const id = setInterval(() => {
      const cutoff = Date.now() - TTL_MS;
      setBursts((prev) => {
        const next = prev.filter((b) => b.at > cutoff);
        // `filter` always allocates, so returning it unconditionally would
        // re-render the host's stage twice a second for the whole life of a
        // burst. Hand back the same reference when nothing actually expired
        // and React bails out.
        return next.length === prev.length ? prev : next;
      });
    }, 500);
    return () => clearInterval(id);
  }, [bursts.length]);

  const react = useCallback(
    (emoji: ReactionEmoji) => {
      if (isHost || !connected) return;
      sendRef.current?.({
        t: "reaction",
        emoji,
        displayName: getVoterDisplayName(),
        at: Date.now(),
      });
    },
    [connected, isHost],
  );

  return { bursts, react };
}
