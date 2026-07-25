/**
 * Shared domain types for the live shopping experience.
 *
 * `Product` is the app-facing shape. It is deliberately narrower than the raw
 * Channel3 payload — see `lib/channel3.ts` for the mapping — so the UI never
 * touches vendor-specific field names.
 */

export type Availability = "InStock" | "OutOfStock";

export interface Product {
  /** Channel3 catalog id. Maps to `products.external_id` when persisted. */
  id: string;
  name: string;
  imageUrl: string | null;
  /** Major units (dollars), not cents — the UI formats this directly. */
  price: number;
  currency: string;
  /** Retailer host, e.g. "uniqlo.com". */
  retailer: string;
  /** Channel3 trackable link. Attribution/payout handled upstream. */
  buyUrl: string;
  /** Percent, e.g. 4 for 4%. Channel3 returns a fraction; we convert. */
  commissionRate: number;
  availability: Availability | null;
  /** Host's spoken/typed aside about this item. */
  note: string;
  /** Epoch ms, set when the host pinned it. Orders the shopping trail. */
  addedAt: number;
  /** Host-curated or brand-sponsored placement — pinned to top on replay. */
  featured?: boolean;
}

export type VoteChoice = "buy" | "skip";

export interface VoteTally {
  buy: number;
  skip: number;
}

export interface VoteRecord {
  voterId: string;
  displayName: string;
  choice: VoteChoice;
}

export type PollStatus = "open" | "closed" | "dismissed";

export interface PollOption {
  /** Stable within its poll: "opt-0".."opt-3". */
  id: string;
  label: string;
  emoji: string;
  count: number;
}

/** An audience poll the host runs over the stream. See `lib/poll-store.ts`. */
export interface Poll {
  id: string;
  question: string;
  /** 2–4 entries. Counts live here — options never outlive their poll. */
  options: PollOption[];
  /** `dismissed` is a state, not a deletion, so it can travel as a message. */
  status: PollStatus;
  /** Epoch ms. Duration kept explicit so a remounted countdown can resume. */
  startedAt: number;
  endsAt: number;
  durationMs: number;
}
