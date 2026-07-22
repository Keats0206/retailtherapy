"use client";

import { useCallback, useMemo, useState } from "react";

import {
  EMPTY,
  applyPin,
  applySetNote,
  applyUnpin,
  applyVote,
  selectPinned,
  selectVotesFor,
  type StreamSnapshot,
  type StreamState,
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

  const pin = useCallback((product: Product) => {
    setState((prev) => applyPin(prev, product));
  }, []);

  const unpin = useCallback(() => {
    setState((prev) => applyUnpin(prev));
  }, []);

  const setNote = useCallback((productId: string, note: string) => {
    setState((prev) => applySetNote(prev, productId, note));
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

  const pinned = useMemo(() => selectPinned(state), [state]);

  const votesFor = useCallback(
    (productId: string) => selectVotesFor(state, productId),
    [state],
  );

  return {
    pinned,
    trail: state.trail,
    snapshot: state,
    votesFor,
    myVotes,
    pin,
    unpin,
    setNote,
    vote,
  };
}
