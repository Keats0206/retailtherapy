/**
 * Shared sort options for live and replay shopping trails.
 */
import type { Product, VoteTally } from "@/lib/types";

export const TRAIL_SORTS = [
  { id: "order", label: "Show order" },
  { id: "wanted", label: "Most wanted" },
  { id: "price", label: "Price" },
] as const;

export type TrailSortId = (typeof TRAIL_SORTS)[number]["id"];

function buyPct(votes: VoteTally): number | null {
  const total = votes.buy + votes.skip;
  return total ? Math.round((votes.buy / total) * 100) : null;
}

export function sortTrailProducts(
  products: Product[],
  sort: TrailSortId,
  votesFor: (productId: string) => VoteTally,
): Product[] {
  const items = [...products];

  if (sort === "price") {
    return items.sort((a, b) => a.price - b.price);
  }

  if (sort === "wanted") {
    return items.sort((a, b) => {
      const av = votesFor(a.id);
      const bv = votesFor(b.id);
      return (
        bv.buy - av.buy || (buyPct(bv) ?? 0) - (buyPct(av) ?? 0)
      );
    });
  }

  return items;
}

/** Featured items first, then the rest in their original order. */
export function sortFeaturedFirst(products: Product[]): Product[] {
  const featured = products.filter((p) => p.featured);
  const rest = products.filter((p) => !p.featured);
  return [...featured, ...rest];
}

export function sortTrailForReplay(
  products: Product[],
  sort: TrailSortId,
  votesFor: (productId: string) => VoteTally,
): Product[] {
  const featured = products.filter((p) => p.featured);
  const rest = products.filter((p) => !p.featured);
  const sortedRest = sortTrailProducts(rest, sort, votesFor);
  return [...featured, ...sortedRest];
}
