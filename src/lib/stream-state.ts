"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useConnectionState, useDataChannel } from "@livekit/components-react";
import { ConnectionState } from "livekit-client";

import type { Product, VoteChoice, VoteTally } from "@/lib/types";

/**
 * Shared shopping state for a live room, carried over the LiveKit data channel.
 *
 * The host is authoritative: it owns the pinned product, the trail, and the
 * vote tallies, and rebroadcasts a full snapshot on every change. Viewers only
 * ever emit `hello` (asking for the current state) and `vote`.
 *
 * Snapshots are whole-state rather than incremental on purpose — a stream
 * carries a handful of products, so the bandwidth is trivial and it removes any
 * chance of viewers drifting out of sync after a dropped packet.
 *
 * Note this state is ephemeral: it lives only as long as the room. Persisting
 * to `streams` / `stream_products` is what makes replay possible later.
 */

const TOPIC = "shop";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export interface StreamSnapshot {
  pinnedId: string | null;
  /** Every product pinned this session, oldest first. */
  trail: Product[];
  votes: Record<string, VoteTally>;
}

type StreamEvent =
  | { t: "hello" }
  | { t: "snapshot"; state: StreamSnapshot }
  | { t: "vote"; productId: string; choice: VoteChoice };

const EMPTY: StreamSnapshot = { pinnedId: null, trail: [], votes: {} };

function applyVote(
  state: StreamSnapshot,
  productId: string,
  choice: VoteChoice,
): StreamSnapshot {
  const current = state.votes[productId] ?? { buy: 0, skip: 0 };
  return {
    ...state,
    votes: {
      ...state.votes,
      [productId]: { ...current, [choice]: current[choice] + 1 },
    },
  };
}

export function useStreamState({ isHost }: { isHost: boolean }) {
  const [state, setState] = useState<StreamSnapshot>(EMPTY);
  /** Choices this browser already made, so the UI can lock its buttons. */
  const [myVotes, setMyVotes] = useState<Record<string, VoteChoice>>({});

  // The message handler needs the latest state without being re-created on
  // every change (which would churn the data-channel subscription). Only ever
  // read from the handler, so syncing in an effect is safe.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const sendRef = useRef<((event: StreamEvent) => void) | null>(null);

  const handleMessage = useCallback(
    (raw: { payload: Uint8Array }) => {
      let event: StreamEvent;
      try {
        event = JSON.parse(decoder.decode(raw.payload)) as StreamEvent;
      } catch {
        return; // Not ours, or malformed — ignore.
      }

      if (isHost) {
        if (event.t === "hello") {
          // A viewer just joined; catch them up.
          sendRef.current?.({ t: "snapshot", state: stateRef.current });
        } else if (event.t === "vote") {
          setState((prev) => applyVote(prev, event.productId, event.choice));
        }
        return;
      }

      if (event.t === "snapshot") {
        setState(event.state);
      }
    },
    [isHost],
  );

  const { send } = useDataChannel(TOPIC, handleMessage);
  const connectionState = useConnectionState();
  const connected = connectionState === ConnectionState.Connected;

  // The underlying peer connection only exists while connected. Sending outside
  // that window throws UnexpectedConnectionState ("PC manager is closed"), so
  // guard on the way in and swallow the race on the way out: a send can still
  // lose to a disconnect that lands mid-flight.
  useEffect(() => {
    if (!connected) {
      sendRef.current = null;
      return;
    }
    sendRef.current = (event: StreamEvent) => {
      send(encoder.encode(JSON.stringify(event)), { reliable: true }).catch(
        () => {
          // Dropped because the room went away. Safe to ignore: the host
          // rebroadcasts a full snapshot on its next change, and viewers
          // re-`hello` when they reconnect.
        },
      );
    };
    return () => {
      sendRef.current = null;
    };
  }, [send, connected]);

  // Host: publish authoritative state whenever it changes — and once on
  // connect, so a host who pinned something before the room came up still
  // publishes it.
  useEffect(() => {
    if (!isHost || !connected) return;
    sendRef.current?.({ t: "snapshot", state });
  }, [isHost, connected, state]);

  // Viewer: ask to be caught up once connected. The host may still be setting
  // up its own handler, and an unanswered hello is cheap, so retry a few times.
  useEffect(() => {
    if (isHost || !connected) return;
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      sendRef.current?.({ t: "hello" });
      if (attempts >= 3) clearInterval(timer);
    }, 700);
    return () => clearInterval(timer);
  }, [isHost, connected]);

  const pin = useCallback((product: Product) => {
    setState((prev) => {
      const exists = prev.trail.some((p) => p.id === product.id);
      return {
        ...prev,
        pinnedId: product.id,
        trail: exists ? prev.trail : [...prev.trail, product],
      };
    });
  }, []);

  const unpin = useCallback(() => {
    setState((prev) => ({ ...prev, pinnedId: null }));
  }, []);

  /** Host-only: attach an aside to a product ("runs small, size up"). */
  const setNote = useCallback((productId: string, note: string) => {
    setState((prev) => ({
      ...prev,
      trail: prev.trail.map((p) => (p.id === productId ? { ...p, note } : p)),
    }));
  }, []);

  const vote = useCallback(
    (productId: string, choice: VoteChoice) => {
      if (myVotes[productId]) return;
      // Don't burn the viewer's one vote while disconnected — it would lock the
      // buttons without ever reaching the host.
      if (!isHost && !connected) return;

      setMyVotes((prev) => ({ ...prev, [productId]: choice }));

      if (isHost) {
        setState((prev) => applyVote(prev, productId, choice));
      } else {
        sendRef.current?.({ t: "vote", productId, choice });
      }
    },
    [isHost, connected, myVotes],
  );

  const pinned = useMemo(
    () => state.trail.find((p) => p.id === state.pinnedId) ?? null,
    [state.trail, state.pinnedId],
  );

  const votesFor = useCallback(
    (productId: string): VoteTally => state.votes[productId] ?? { buy: 0, skip: 0 },
    [state.votes],
  );

  return {
    pinned,
    trail: state.trail,
    votesFor,
    myVotes,
    pin,
    unpin,
    setNote,
    vote,
  };
}
