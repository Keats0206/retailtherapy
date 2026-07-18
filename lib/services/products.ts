import type { Product } from "../types";
import { seedProducts } from "../mock-data";
import { uid } from "../store";

/**
 * Product lookup service. In the prototype this returns mock data (standing in for
 * Channel3's /lookup). When keys exist, add a `USE_MOCKS === false` branch that calls
 * Channel3 and maps the response onto `Product` — callers stay unchanged.
 */
export const USE_MOCKS = true;

function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function blankFields() {
  return {
    verdict: null,
    note: "",
    pinned: false,
    clicks: 0,
    votes: { buy: 0, skip: 0 },
    addedAt: Date.now(),
  };
}

/** Simulated Channel3 lookup. Matches a seed product by URL, else fabricates one. */
export async function lookupProduct(url: string): Promise<Product> {
  // Simulate network latency so the studio "resolving…" state is visible.
  await new Promise((r) => setTimeout(r, 600));

  const trimmed = url.trim();
  const host = hostOf(trimmed);

  // Try to match a seed product by exact URL or by retailer host.
  const match =
    seedProducts.find((p) => p.url === trimmed) ??
    seedProducts.find((p) => hostOf(p.url) === host);

  if (match) {
    return { ...match, id: uid("prod"), url: trimmed || match.url, ...blankFields() };
  }

  // Fabricate a plausible product for any unrecognized URL.
  const retailer = host || "unknown-retailer.com";
  const price = 60 + Math.floor(Math.random() * 900);
  return {
    id: uid("prod"),
    name: guessName(trimmed),
    imageUrl:
      "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=600&h=600&fit=crop",
    price,
    currency: "USD",
    retailer,
    url: trimmed || `https://${retailer}`,
    affiliateUrl: `https://track.channel3.mock/o/${uid("aff")}`,
    commissionRate: 5 + Math.floor(Math.random() * 6),
    ...blankFields(),
  };
}

function guessName(url: string): string {
  try {
    const path = new URL(url).pathname
      .split("/")
      .filter(Boolean)
      .pop();
    if (!path) return "New Product";
    return path
      .replace(/[-_]+/g, " ")
      .replace(/\.[a-z]+$/i, "")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .slice(0, 48);
  } catch {
    return "New Product";
  }
}
