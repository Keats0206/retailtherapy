"use client";

import { useCallback, useMemo, useState } from "react";

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
 * `useStreamState` with the wire taken out — same transitions, same return
 * shape, but the host and the viewer are the same browser tab.
 *
 * This is what lets /prototype render the real studio and watch layouts with
 * nothing configured: no LiveKit room, no token, no camera. Because both hooks
 * share `lib/stream-store.ts`, pinning and voting behave here exactly as they
 * do on a live stream.
 */
export function useMockStreamState(
  initial: StreamSnapshot = EMPTY,
): StreamState {
  const [state, setState] = useState<StreamSnapshot>(initial);
  const [myVotes, setMyVotes] = useState<Record<string, VoteChoice>>({});
  const [myVerseVotes, setMyVerseVotes] = useState<
    Record<string, VerseChoice>
  >({});

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
      // One vote per product, same as the real thing.
      if (myVotes[productId]) return;
      setMyVotes((prev) => ({ ...prev, [productId]: choice }));
      setState((prev) => applyVote(prev, productId, choice));
    },
    [myVotes],
  );

  const verseVote = useCallback(
    (verseId: string, choice: VerseChoice) => {
      if (myVerseVotes[verseId]) return;
      setMyVerseVotes((prev) => ({ ...prev, [verseId]: choice }));
      setState((prev) => applyVerseVote(prev, verseId, choice));
    },
    [myVerseVotes],
  );

  const pinned = useMemo(() => selectPinned(state), [state]);
  const verse = useMemo(() => selectVerse(state), [state]);

  const votesFor = useCallback(
    (productId: string) => selectVotesFor(state, productId),
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
  };
}
