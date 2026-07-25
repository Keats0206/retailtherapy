"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useConnectionState, useDataChannel } from "@livekit/components-react";
import { ConnectionState } from "livekit-client";

import {
  EMPTY,
  applyEndInteraction,
  applyPin,
  applySetFeatured,
  applySetNote,
  applyStartVerse,
  applyUnpin,
  applyVerseVote,
  applyVote,
  selectPinned,
  selectVerse,
  selectVerseVotesFor,
  selectVotersFor,
  selectVotesFor,
  type StreamSnapshot,
  type StreamState,
  type VerseChoice,
} from "@/lib/stream-store";
import type { Product, VoteChoice } from "@/lib/types";
import { getVoterDisplayName, getVoterId } from "@/lib/voter-identity";

/**
 * Shared shopping state for a live room, carried over the LiveKit data channel.
 *
 * The state transitions themselves live in `lib/stream-store.ts` — this module
 * is only the transport. The host is authoritative: it owns the pinned product,
 * the trail, and the vote tallies, and rebroadcasts a full snapshot on every
 * change. Viewers only ever emit `hello` (asking for the current state) and
 * `vote`.
 *
 * Snapshots are whole-state rather than incremental on purpose — a stream
 * carries a handful of products, so the bandwidth is trivial and it removes any
 * chance of viewers drifting out of sync after a dropped packet.
 *
 * The wire itself is still ephemeral — it lives only as long as the room — but
 * the host mirrors `snapshot` to `streams.snapshot` as the show runs, and that
 * is what /s/<slug> replays once it ends.
 */

const TOPIC = "shop";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

type StreamEvent =
  | { t: "hello" }
  | { t: "snapshot"; state: StreamSnapshot }
  | {
      t: "vote";
      productId: string;
      choice: VoteChoice;
      voterId: string;
      displayName: string;
    }
  | { t: "verseVote"; verseId: string; choice: VerseChoice };

export type { StreamSnapshot };

export function useStreamState({
  isHost,
  initialSnapshot,
}: {
  isHost: boolean;
  initialSnapshot?: StreamSnapshot;
}): StreamState {
  const [state, setState] = useState<StreamSnapshot>(
    () => initialSnapshot ?? EMPTY,
  );
  /** Choices this browser already made, so the UI can lock its buttons. */
  const [myVotes, setMyVotes] = useState<Record<string, VoteChoice>>({});
  const [myVerseVotes, setMyVerseVotes] = useState<
    Record<string, VerseChoice>
  >({});

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
          setState((prev) =>
            applyVote(prev, event.productId, event.choice, {
              voterId: event.voterId,
              displayName: event.displayName,
            }),
          );
        } else if (event.t === "verseVote") {
          setState((prev) =>
            applyVerseVote(prev, event.verseId, event.choice),
          );
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
    setState((prev) => applyPin(prev, product));
  }, []);

  const unpin = useCallback(() => {
    setState((prev) => applyUnpin(prev));
  }, []);

  const endInteraction = useCallback(() => {
    setState((prev) => applyEndInteraction(prev));
  }, []);

  const setNote = useCallback((productId: string, note: string) => {
    setState((prev) => applySetNote(prev, productId, note));
  }, []);

  const setFeatured = useCallback((productId: string, featured: boolean) => {
    setState((prev) => applySetFeatured(prev, productId, featured));
  }, []);

  const startVerse = useCallback((left: Product, right: Product) => {
    setState((prev) => applyStartVerse(prev, left, right));
  }, []);

  const vote = useCallback(
    (productId: string, choice: VoteChoice) => {
      if (myVotes[productId]) return;
      // Don't burn the viewer's one vote while disconnected — it would lock the
      // buttons without ever reaching the host.
      if (!isHost && !connected) return;

      setMyVotes((prev) => ({ ...prev, [productId]: choice }));

      const voter = {
        voterId: getVoterId(),
        displayName: getVoterDisplayName(),
      };

      if (isHost) {
        setState((prev) => applyVote(prev, productId, choice, voter));
      } else {
        sendRef.current?.({
          t: "vote",
          productId,
          choice,
          voterId: voter.voterId,
          displayName: voter.displayName,
        });
      }
    },
    [isHost, connected, myVotes],
  );

  const verseVote = useCallback(
    (verseId: string, choice: VerseChoice) => {
      if (myVerseVotes[verseId]) return;
      if (!isHost && !connected) return;

      setMyVerseVotes((prev) => ({ ...prev, [verseId]: choice }));

      if (isHost) {
        setState((prev) => applyVerseVote(prev, verseId, choice));
      } else {
        sendRef.current?.({ t: "verseVote", verseId, choice });
      }
    },
    [isHost, connected, myVerseVotes],
  );

  const pinned = useMemo(() => selectPinned(state), [state]);
  const verse = useMemo(() => selectVerse(state), [state]);

  const votesFor = useCallback(
    (productId: string) => selectVotesFor(state, productId),
    [state],
  );

  const votersFor = useCallback(
    (productId: string) => selectVotersFor(state, productId),
    [state],
  );

  const verseVotesFor = useCallback(
    (verseId: string) => selectVerseVotesFor(state, verseId),
    [state],
  );

  return {
    active: state.active,
    pinned,
    verse,
    trail: state.trail,
    snapshot: state,
    votesFor,
    votersFor,
    verseVotesFor,
    myVotes,
    myVerseVotes,
    pin,
    unpin,
    endInteraction,
    setNote,
    setFeatured,
    vote,
    startVerse,
    verseVote,
  };
}
