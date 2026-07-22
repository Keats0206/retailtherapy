/**
 * The shopping state of a live room, and the pure transitions over it.
 *
 * Deliberately transport-free: no LiveKit, no React. `useStreamState` drives
 * this over the room's data channel; `useMockStreamState` drives the same
 * transitions from local state for the /prototype route. Keeping the rules in
 * one place is what stops the prototype from drifting away from the real thing.
 */

import type { Product, VoteChoice, VoteTally } from "@/lib/types";

export interface StreamSnapshot {
  pinnedId: string | null;
  /** Every product pinned this session, oldest first. */
  trail: Product[];
  votes: Record<string, VoteTally>;
  /** Frozen when the host ends the show — used for the recap page. */
  stats?: { peakViewers: number; chatCount: number };
}

export const EMPTY: StreamSnapshot = { pinnedId: null, trail: [], votes: {} };

export const NO_VOTES: VoteTally = { buy: 0, skip: 0 };

export function applyVote(
  state: StreamSnapshot,
  productId: string,
  choice: VoteChoice,
): StreamSnapshot {
  const current = state.votes[productId] ?? NO_VOTES;
  return {
    ...state,
    votes: {
      ...state.votes,
      [productId]: { ...current, [choice]: current[choice] + 1 },
    },
  };
}

/** Pin a product, adding it to the trail the first time it's shown. */
export function applyPin(
  state: StreamSnapshot,
  product: Product,
): StreamSnapshot {
  const exists = state.trail.some((p) => p.id === product.id);
  return {
    ...state,
    pinnedId: product.id,
    trail: exists ? state.trail : [...state.trail, product],
  };
}

export function applyUnpin(state: StreamSnapshot): StreamSnapshot {
  return { ...state, pinnedId: null };
}

/** Host-only: attach an aside to a product ("runs small, size up"). */
export function applySetNote(
  state: StreamSnapshot,
  productId: string,
  note: string,
): StreamSnapshot {
  return {
    ...state,
    trail: state.trail.map((p) => (p.id === productId ? { ...p, note } : p)),
  };
}

export function selectPinned(state: StreamSnapshot): Product | null {
  return state.trail.find((p) => p.id === state.pinnedId) ?? null;
}

export function selectVotesFor(
  state: StreamSnapshot,
  productId: string,
): VoteTally {
  return state.votes[productId] ?? NO_VOTES;
}

/**
 * What both hooks hand to the UI. `StudioLayout` and `WatchLayout` take this
 * shape, so they render identically whether the state came off the wire or out
 * of the prototype harness.
 */
export interface StreamState {
  pinned: Product | null;
  trail: Product[];
  /**
   * The whole state, undecomposed. The host persists this to `streams.snapshot`
   * so the show has a recap after it ends; nothing in the UI reads it.
   */
  snapshot: StreamSnapshot;
  votesFor: (productId: string) => VoteTally;
  /** Choices this browser already made, so the UI can lock its buttons. */
  myVotes: Record<string, VoteChoice>;
  pin: (product: Product) => void;
  unpin: () => void;
  setNote: (productId: string, note: string) => void;
  vote: (productId: string, choice: VoteChoice) => void;
}
