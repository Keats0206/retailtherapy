/**
 * The shopping state of a live room, and the pure transitions over it.
 *
 * Deliberately transport-free: no LiveKit, no React. `useStreamState` drives
 * this over the room's data channel.
 */

import {
  type ActiveInteraction,
  type VerseChoice,
  type VerseTally,
  NO_VERSE_VOTES,
  selectActiveProduct,
  selectVerse,
} from "@/lib/interaction-models";
import type { Product, VoteChoice, VoteTally } from "@/lib/types";

export type { ActiveInteraction, VerseChoice, VerseTally };
export { selectVerse } from "@/lib/interaction-models";

export interface StreamSnapshot {
  /** One interaction on screen at a time — spotlight or verse. */
  active: ActiveInteraction | null;
  /** Every product pinned this session, oldest first. */
  trail: Product[];
  votes: Record<string, VoteTally>;
  verseVotes: Record<string, VerseTally>;
  /** Frozen when the host ends the show — used for the recap page. */
  stats?: { peakViewers: number; chatCount: number };
}

export const EMPTY: StreamSnapshot = {
  active: null,
  trail: [],
  votes: {},
  verseVotes: {},
};

export const NO_VOTES: VoteTally = { buy: 0, skip: 0 };

function addToTrail(state: StreamSnapshot, product: Product): Product[] {
  const exists = state.trail.some((p) => p.id === product.id);
  return exists ? state.trail : [...state.trail, product];
}

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

export function applyVerseVote(
  state: StreamSnapshot,
  verseId: string,
  choice: VerseChoice,
): StreamSnapshot {
  const current = state.verseVotes[verseId] ?? NO_VERSE_VOTES;
  return {
    ...state,
    verseVotes: {
      ...state.verseVotes,
      [verseId]: { ...current, [choice]: current[choice] + 1 },
    },
  };
}

/** Pin a product, adding it to the trail the first time it's shown. */
export function applyPin(
  state: StreamSnapshot,
  product: Product,
): StreamSnapshot {
  return {
    ...state,
    active: { kind: "spotlight", productId: product.id },
    trail: addToTrail(state, product),
  };
}

export function applyStartVerse(
  state: StreamSnapshot,
  left: Product,
  right: Product,
): StreamSnapshot {
  const id = `verse-${Date.now()}`;
  let trail = addToTrail(state, left);
  trail = trail.some((p) => p.id === right.id)
    ? trail
    : [...trail, right];

  return {
    ...state,
    active: {
      kind: "verse",
      id,
      leftId: left.id,
      rightId: right.id,
      startedAt: Date.now(),
    },
    trail,
  };
}

export function applyUnpin(state: StreamSnapshot): StreamSnapshot {
  return { ...state, active: null };
}

/** Alias for ending any active interaction (spotlight or verse). */
export function applyEndInteraction(state: StreamSnapshot): StreamSnapshot {
  return applyUnpin(state);
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
  return selectActiveProduct(state);
}

export function selectVotesFor(
  state: StreamSnapshot,
  productId: string,
): VoteTally {
  return state.votes[productId] ?? NO_VOTES;
}

export function selectVerseVotesFor(
  state: StreamSnapshot,
  verseId: string,
): VerseTally {
  return state.verseVotes[verseId] ?? NO_VERSE_VOTES;
}

/**
 * What both hooks hand to the UI. `StudioLayout` and `WatchLayout` take this
 * shape, so they render identically whether the state came off the wire or out
 * of the prototype harness.
 */
export interface StreamState {
  active: ActiveInteraction | null;
  pinned: Product | null;
  verse: ReturnType<typeof selectVerse>;
  trail: Product[];
  /**
   * The whole state, undecomposed. The host persists this to `streams.snapshot`
   * so the show has a recap after it ends; nothing in the UI reads it.
   */
  snapshot: StreamSnapshot;
  votesFor: (productId: string) => VoteTally;
  verseVotesFor: (verseId: string) => VerseTally;
  /** Choices this browser already made, so the UI can lock its buttons. */
  myVotes: Record<string, VoteChoice>;
  myVerseVotes: Record<string, VerseChoice>;
  pin: (product: Product) => void;
  unpin: () => void;
  endInteraction: () => void;
  setNote: (productId: string, note: string) => void;
  vote: (productId: string, choice: VoteChoice) => void;
  startVerse: (left: Product, right: Product) => void;
  verseVote: (verseId: string, choice: VerseChoice) => void;
}
