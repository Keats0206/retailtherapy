"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useConnectionState, useDataChannel } from "@livekit/components-react";

import {
  EMPTY,
  applyEndInteraction,
  applyPin,
  applySetNote,
  applyStartVerse,
  applyUnpin,
  applyVerseVote,
  applyVote,
  selectPinned,
  selectVerse,
  selectVerseVotesFor,
  selectVotesFor,
  type StreamSnapshot,
  type StreamState,
  type VerseChoice,
} from "@/lib/stream-store";
import type { Product, VoteChoice } from "@/lib/types";

/**
 * Shared shopping state for a live room, carried over the LiveKit data channel.
 *
 * The host is authoritative. Full snapshots go out on structural changes
 * (pin, trail, notes); vote tallies use lightweight patches so viewers do not
 * re-render the entire layout on every tap.
 */

const TOPIC = "shop";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

type StreamEvent =
  | { t: "hello" }
  | { t: "snapshot"; state: StreamSnapshot }
  | { t: "vote"; productId: string; choice: VoteChoice }
  | { t: "votePatch"; productId: string; choice: VoteChoice }
  | { t: "verseVote"; verseId: string; choice: VerseChoice }
  | { t: "verseVotePatch"; verseId: string; choice: VerseChoice };

export type { StreamSnapshot };

export function useStreamState({ isHost }: { isHost: boolean }): StreamState {
  const [state, setState] = useState<StreamSnapshot>(EMPTY);
  const [myVotes, setMyVotes] = useState<Record<string, VoteChoice>>({});
  const [myVerseVotes, setMyVerseVotes] = useState<
    Record<string, VerseChoice>
  >({});

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const myVotesRef = useRef(myVotes);
  useEffect(() => {
    myVotesRef.current = myVotes;
  }, [myVotes]);

  const myVerseVotesRef = useRef(myVerseVotes);
  useEffect(() => {
    myVerseVotesRef.current = myVerseVotes;
  }, [myVerseVotes]);

  const sendRef = useRef<((event: StreamEvent) => void) | null>(null);
  /** Skip the next full snapshot broadcast — a vote patch was already sent. */
  const skipNextSnapshotRef = useRef(false);

  const broadcastVotePatch = useCallback(
    (productId: string, choice: VoteChoice) => {
      skipNextSnapshotRef.current = true;
      sendRef.current?.({ t: "votePatch", productId, choice });
    },
    [],
  );

  const broadcastVerseVotePatch = useCallback(
    (verseId: string, choice: VerseChoice) => {
      skipNextSnapshotRef.current = true;
      sendRef.current?.({ t: "verseVotePatch", verseId, choice });
    },
    [],
  );

  const handleMessage = useCallback(
    (raw: { payload: Uint8Array }) => {
      let event: StreamEvent;
      try {
        event = JSON.parse(decoder.decode(raw.payload)) as StreamEvent;
      } catch {
        return;
      }

      if (isHost) {
        if (event.t === "hello") {
          sendRef.current?.({ t: "snapshot", state: stateRef.current });
        } else if (event.t === "vote") {
          setState((prev) => applyVote(prev, event.productId, event.choice));
          broadcastVotePatch(event.productId, event.choice);
        } else if (event.t === "verseVote") {
          setState((prev) =>
            applyVerseVote(prev, event.verseId, event.choice),
          );
          broadcastVerseVotePatch(event.verseId, event.choice);
        }
        return;
      }

      if (event.t === "snapshot") {
        setState(event.state);
      } else if (event.t === "votePatch") {
        setState((prev) => applyVote(prev, event.productId, event.choice));
      } else if (event.t === "verseVotePatch") {
        setState((prev) =>
          applyVerseVote(prev, event.verseId, event.choice),
        );
      }
    },
    [isHost, broadcastVotePatch, broadcastVerseVotePatch],
  );

  const { send } = useDataChannel(TOPIC, handleMessage);
  const connectionState = useConnectionState();
  const connected = connectionState === "connected";

  useEffect(() => {
    if (!connected) {
      sendRef.current = null;
      return;
    }
    sendRef.current = (event: StreamEvent) => {
      send(encoder.encode(JSON.stringify(event)), { reliable: true }).catch(
        () => {},
      );
    };
    return () => {
      sendRef.current = null;
    };
  }, [send, connected]);

  useEffect(() => {
    if (!isHost || !connected) return;
    if (skipNextSnapshotRef.current) {
      skipNextSnapshotRef.current = false;
      return;
    }
    sendRef.current?.({ t: "snapshot", state });
  }, [isHost, connected, state]);

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

  const startVerse = useCallback((left: Product, right: Product) => {
    setState((prev) => applyStartVerse(prev, left, right));
  }, []);

  const vote = useCallback(
    (productId: string, choice: VoteChoice) => {
      if (myVotesRef.current[productId]) return;
      if (!isHost && !connected) return;

      setMyVotes((prev) => ({ ...prev, [productId]: choice }));

      if (isHost) {
        setState((prev) => applyVote(prev, productId, choice));
        broadcastVotePatch(productId, choice);
      } else {
        sendRef.current?.({ t: "vote", productId, choice });
      }
    },
    [isHost, connected, broadcastVotePatch],
  );

  const verseVote = useCallback(
    (verseId: string, choice: VerseChoice) => {
      if (myVerseVotesRef.current[verseId]) return;
      if (!isHost && !connected) return;

      setMyVerseVotes((prev) => ({ ...prev, [verseId]: choice }));

      if (isHost) {
        setState((prev) => applyVerseVote(prev, verseId, choice));
        broadcastVerseVotePatch(verseId, choice);
      } else {
        sendRef.current?.({ t: "verseVote", verseId, choice });
      }
    },
    [isHost, connected, broadcastVerseVotePatch],
  );

  const pinned = useMemo(() => selectPinned(state), [state]);
  const verse = useMemo(() => selectVerse(state), [state]);

  const votesFor = useCallback(
    (productId: string) => selectVotesFor(state, productId),
    [state.votes],
  );

  const verseVotesFor = useCallback(
    (verseId: string) => selectVerseVotesFor(state, verseId),
    [state.verseVotes],
  );

  return useMemo(
    (): StreamState => ({
      active: state.active,
      pinned,
      verse,
      trail: state.trail,
      snapshot: state,
      votesFor,
      verseVotesFor,
      myVotes,
      myVerseVotes,
      pin,
      unpin,
      endInteraction,
      setNote,
      vote,
      startVerse,
      verseVote,
    }),
    [
      state,
      pinned,
      verse,
      votesFor,
      verseVotesFor,
      myVotes,
      myVerseVotes,
      pin,
      unpin,
      endInteraction,
      setNote,
      vote,
      startVerse,
      verseVote,
    ],
  );
}
