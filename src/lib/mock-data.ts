/**
 * Seed data for the /prototype route. Nothing here is fetched, so the
 * prototype renders with no API keys, no network, and no LiveKit room.
 */

import type { ChatLine } from "@/components/chat-panel";
import type { StreamSnapshot } from "@/lib/stream-store";
import type { Product } from "@/lib/types";

/**
 * Product imagery as inline SVG rather than retailer CDN URLs: the prototype
 * has to work offline and must never render a broken image, which would read as
 * a layout bug while you're iterating on layout. Swap in real URLs if you need
 * photographic fidelity — `CurrentProduct` uses a plain <img>, so any host works.
 */
function swatch(label: string, tone: number): string {
  const bg = `hsl(0 0% ${tone}%)`;
  const fg = tone > 50 ? "#00000066" : "#ffffff99";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="${bg}"/><text x="200" y="208" fill="${fg}" font-family="ui-sans-serif,system-ui,sans-serif" font-size="20" letter-spacing="2" text-anchor="middle">${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const HOUR = 1000 * 60 * 60;
/** Fixed epoch so server and client render the same trail — no hydration drift. */
const SESSION_START = 1_760_000_000_000;

export const MOCK_PRODUCTS: Product[] = [
  {
    id: "mock-uniqlo-1",
    name: "Merino Crew Neck Sweater",
    imageUrl: swatch("KNIT", 88),
    price: 49.9,
    currency: "USD",
    retailer: "uniqlo.com",
    buyUrl: "https://www.uniqlo.com/us/en/products/E465198-000",
    commissionRate: 4,
    availability: "InStock",
    note: "Runs small — size up if you're between sizes.",
    addedAt: SESSION_START,
  },
  {
    id: "mock-ssense-1",
    name: "Wide-Leg Cotton Trouser",
    imageUrl: swatch("TROUSER", 32),
    price: 285,
    currency: "USD",
    retailer: "ssense.com",
    buyUrl: "https://www.ssense.com/en-us/men/product/mock",
    commissionRate: 8,
    availability: "InStock",
    note: "",
    addedAt: SESSION_START + HOUR * 0.2,
  },
  {
    id: "mock-sephora-1",
    name: "Hydrating Lip Balm Duo",
    imageUrl: swatch("BALM", 72),
    price: 24,
    currency: "USD",
    retailer: "sephora.com",
    buyUrl: "https://www.sephora.com/product/mock",
    commissionRate: 6,
    availability: "OutOfStock",
    note: "Sold out in Rosewood — the clear one is still up.",
    addedAt: SESSION_START + HOUR * 0.4,
  },
  {
    id: "mock-rei-1",
    name: "Packable Down Jacket",
    imageUrl: swatch("JACKET", 45),
    price: 199,
    currency: "USD",
    retailer: "rei.com",
    buyUrl: "https://www.rei.com/product/mock",
    commissionRate: 5,
    availability: "InStock",
    note: "",
    addedAt: SESSION_START + HOUR * 0.6,
  },
];

/**
 * Mid-session state: a few products already shown, the sweater on screen, and
 * votes in on the two before it — so both views open with something to look at
 * rather than empty states.
 */
export const MOCK_SNAPSHOT: StreamSnapshot = {
  active: { kind: "spotlight", productId: "mock-uniqlo-1" },
  trail: MOCK_PRODUCTS,
  votes: {
    "mock-uniqlo-1": { buy: 47, skip: 12 },
    "mock-ssense-1": { buy: 18, skip: 31 },
    "mock-sephora-1": { buy: 64, skip: 5 },
  },
  verseVotes: {},
};

export const MOCK_VIEWER_COUNT = 1284;

export const MOCK_CHAT: ChatLine[] = [
  {
    id: "c1",
    timestamp: SESSION_START,
    message: "the grey one!!",
    from: { name: "dana" },
  },
  {
    id: "c2",
    timestamp: SESSION_START + 1000,
    message: "does it come in a tall?",
    from: { name: "marcus" },
  },
  {
    id: "c3",
    timestamp: SESSION_START + 2000,
    message: "i have this exact sweater, it pills after a season fyi",
    from: { name: "june" },
  },
  {
    id: "c4",
    timestamp: SESSION_START + 3000,
    message: "found it cheaper here https://www.uniqlo.com/us/en/products/E465198-000",
    from: { name: "sam" },
  },
  {
    id: "c5",
    timestamp: SESSION_START + 4000,
    message: "buying",
    from: { name: "priya" },
  },
];

/**
 * Stands in for the Channel3 lookup. Derives a plausible product from whatever
 * URL you paste so pinning works with no API key, with a short delay so the
 * "Resolving…" state is actually visible.
 */
export async function resolveMockProduct(url: string): Promise<Product> {
  await new Promise((r) => setTimeout(r, 400));

  let retailer = "example.com";
  try {
    retailer = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    throw new Error("That doesn't look like a URL");
  }

  const brand = retailer.split(".")[0];
  const name = `${brand.charAt(0).toUpperCase()}${brand.slice(1)} Item`;

  return {
    id: `mock-${Date.now()}`,
    name,
    imageUrl: swatch(brand.slice(0, 8).toUpperCase(), 60),
    price: 40 + Math.round(Math.random() * 200),
    currency: "USD",
    retailer,
    buyUrl: url,
    commissionRate: 5,
    availability: "InStock",
    note: "",
    addedAt: Date.now(),
  };
}
