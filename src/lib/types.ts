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
}

export type VoteChoice = "buy" | "skip";

export interface VoteTally {
  buy: number;
  skip: number;
}
