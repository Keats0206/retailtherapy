"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ConnectionState } from "livekit-client";

import { useConnectionState, useDataChannel } from "@/lib/live";

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

  const setFeatured = useCallback((productId: string, featured: boolean) => {
    setState((prev) => applySetFeatured(prev, productId, featured));
  }, []);

  const startVerse = useCallback((left: Product, right: Product) => {
    setState((prev) => applyStartVerse(prev, left, right));
  }, []);

  const vote = useCallback(
    (productId: string, choice: VoteChoice) => {
      if (myVotesRef.current[productId]) return;
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

  const votersFor = useCallback(
    (productId: string) => selectVotersFor(state, productId),
    [state],
  );

  const verseVotesFor = useCallback(
    (verseId: string) => selectVerseVotesFor(state, verseId),
    [state.verseVotes],
  );

  // Memoized because consumers key effects off the whole object. The floating
  // studio re-renders its detached React root whenever this identity changes,
  // and a bare object literal would change it on every render of the host —
  // including every chat message and participant join, which the studio's
  // contents don't depend on. Each member below already changes only when the
  // state it derives from does, so the memo busts exactly when it should.
  return useMemo(
    () => ({
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
    }),
    [
      state,
      pinned,
      verse,
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
    ],
  );
}
