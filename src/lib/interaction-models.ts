/**
 * Live-room interaction types — one active at a time.
 *
 * Spotlight: single product + buy/skip poll (the original model).
 * Verse: two products side-by-side + left/right poll.
 */

import type { Product } from "@/lib/types";

export type SpotlightInteraction = {
  kind: "spotlight";
  productId: string;
};

export type VerseInteraction = {
  kind: "verse";
  id: string;
  leftId: string;
  rightId: string;
  startedAt: number;
};

export type ActiveInteraction = SpotlightInteraction | VerseInteraction;

export type VerseChoice = "left" | "right";

export type VerseTally = { left: number; right: number };

export const NO_VERSE_VOTES: VerseTally = { left: 0, right: 0 };

/** Minimal snapshot fields needed for normalization and selectors. */
export interface SnapshotLike {
  active: ActiveInteraction | null;
  trail: Product[];
  votes: Record<string, { buy: number; skip: number }>;
  verseVotes: Record<string, VerseTally>;
  stats?: { peakViewers: number; chatCount: number };
}

/** Raw snapshot shape before normalization (legacy DB rows). */
type LegacySnapshot = SnapshotLike & { pinnedId?: string | null };

export function normalizeSnapshot(raw: unknown): SnapshotLike {
  if (!raw || typeof raw !== "object") {
    return { active: null, trail: [], votes: {}, verseVotes: {} };
  }

  const value = raw as LegacySnapshot;
  const trail = Array.isArray(value.trail) ? value.trail : [];
  const votes =
    value.votes && typeof value.votes === "object" ? value.votes : {};
  const verseVotes =
    value.verseVotes && typeof value.verseVotes === "object"
      ? value.verseVotes
      : {};

  let active: ActiveInteraction | null = value.active ?? null;

  if (!active && value.pinnedId) {
    active = { kind: "spotlight", productId: value.pinnedId };
  }

  return {
    active,
    trail,
    votes,
    verseVotes,
    stats: value.stats,
  };
}

export function selectActiveProduct(state: SnapshotLike): Product | null {
  const active = state.active;
  if (active?.kind !== "spotlight") return null;
  return state.trail.find((p) => p.id === active.productId) ?? null;
}

export function selectVerse(state: SnapshotLike): {
  id: string;
  left: Product;
  right: Product;
  tallies: VerseTally;
} | null {
  if (state.active?.kind !== "verse") return null;
  const { id, leftId, rightId } = state.active;
  const left = state.trail.find((p) => p.id === leftId);
  const right = state.trail.find((p) => p.id === rightId);
  if (!left || !right) return null;
  return {
    id,
    left,
    right,
    tallies: state.verseVotes[id] ?? NO_VERSE_VOTES,
  };
}

/** Spotlight product id for trail highlighting and DB persistence. */
export function spotlightProductId(state: SnapshotLike): string | null {
  if (state.active?.kind === "spotlight") return state.active.productId;
  return null;
}
