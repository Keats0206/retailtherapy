/**
 * Stand-in data for the stream-flow prototype.
 *
 * Nothing here talks to LiveKit, Mux or Channel3 — the point of this page is to
 * exercise the *flow* (set a hunt, go live, share the browser, browse across
 * sites, end, recap) without a real broadcast attached.
 */

/** Example shows. A show is a hunt, not a store — that framing drives the UI. */
export const MOCK_MISSIONS = [
  "White tank tops under $40",
  "Winter coat under $300",
  "Wedding guest dresses",
  "Vintage denim, size 27",
  "Work trousers that aren't boring",
  "Gifts under $50",
];

export type MockSite = {
  id: string;
  name: string;
  domain: string;
  /** Site tint — the storefront banner and the tab favicon dot. */
  tint: string;
};

/**
 * The tabs open in the host's browser window. Plural on purpose: a hunt spans
 * sites, and that's exactly why the share has to be the whole window.
 */
export const MOCK_SITES: MockSite[] = [
  { id: "everlane", name: "Everlane", domain: "everlane.com", tint: "#3f5b70" },
  { id: "cos", name: "COS", domain: "cos.com", tint: "#5e5342" },
  { id: "uniqlo", name: "Uniqlo", domain: "uniqlo.com", tint: "#b03a2e" },
  { id: "aritzia", name: "Aritzia", domain: "aritzia.com", tint: "#6b5342" },
];

export type MockProduct = {
  id: string;
  siteId: string;
  name: string;
  brand: string;
  price: number;
  from: string;
  to: string;
};

/** Priced so a "under $40" hunt has both hits and misses to react to. */
export const MOCK_PRODUCTS: MockProduct[] = [
  { id: "e1", siteId: "everlane", name: "Cotton rib tank", brand: "Everlane", price: 30, from: "#f4f1ec", to: "#d9d3c8" },
  { id: "e2", siteId: "everlane", name: "Air scoop tank", brand: "Everlane", price: 38, from: "#eeeae3", to: "#cfc7b9" },
  { id: "e3", siteId: "everlane", name: "Boxy crop tank", brand: "Everlane", price: 45, from: "#e6e2dc", to: "#c2bbaf" },
  { id: "e4", siteId: "everlane", name: "Supima long tank", brand: "Everlane", price: 28, from: "#f7f5f1", to: "#ded8cd" },
  { id: "e5", siteId: "everlane", name: "Ribbed square neck", brand: "Everlane", price: 35, from: "#ece8e1", to: "#cbc4b6" },
  { id: "e6", siteId: "everlane", name: "Relaxed muscle tee", brand: "Everlane", price: 42, from: "#f1eee8", to: "#d4cec1" },

  { id: "c1", siteId: "cos", name: "Slim rib vest", brand: "COS", price: 35, from: "#f2f0eb", to: "#d2ccc0" },
  { id: "c2", siteId: "cos", name: "Cotton jersey tank", brand: "COS", price: 29, from: "#efeee9", to: "#c9c4b8" },
  { id: "c3", siteId: "cos", name: "Draped racer tank", brand: "COS", price: 55, from: "#e9e6df", to: "#bdb7aa" },
  { id: "c4", siteId: "cos", name: "Heavyweight vest", brand: "COS", price: 39, from: "#f4f2ee", to: "#d6d0c4" },
  { id: "c5", siteId: "cos", name: "Scoop neck tank", brand: "COS", price: 25, from: "#edeae4", to: "#c7c1b4" },
  { id: "c6", siteId: "cos", name: "Boat neck vest", brand: "COS", price: 49, from: "#f0ede7", to: "#cec8bb" },

  { id: "u1", siteId: "uniqlo", name: "AIRism tank", brand: "Uniqlo", price: 15, from: "#f6f5f2", to: "#dcd8d0" },
  { id: "u2", siteId: "uniqlo", name: "Ribbed cropped tank", brand: "Uniqlo", price: 20, from: "#f2f1ed", to: "#d3cfc6" },
  { id: "u3", siteId: "uniqlo", name: "Supima cotton vest", brand: "Uniqlo", price: 20, from: "#f4f3ef", to: "#d8d4cb" },
  { id: "u4", siteId: "uniqlo", name: "Bra tank top", brand: "Uniqlo", price: 25, from: "#efeeea", to: "#cfcbc2" },
  { id: "u5", siteId: "uniqlo", name: "Seamless rib tank", brand: "Uniqlo", price: 18, from: "#f5f4f1", to: "#dad6ce" },
  { id: "u6", siteId: "uniqlo", name: "Cotton relaxed tank", brand: "Uniqlo", price: 20, from: "#f1f0ec", to: "#d5d1c8" },

  { id: "a1", siteId: "aritzia", name: "Contour scoop tank", brand: "Babaton", price: 38, from: "#f3f0ea", to: "#d5cfc2" },
  { id: "a2", siteId: "aritzia", name: "Sculpt knit tank", brand: "Babaton", price: 48, from: "#eeebe4", to: "#ccc5b7" },
  { id: "a3", siteId: "aritzia", name: "Everyday rib tank", brand: "Wilfred", price: 35, from: "#f5f2ec", to: "#d9d3c6" },
  { id: "a4", siteId: "aritzia", name: "Cropped cami", brand: "Wilfred", price: 40, from: "#eae7e0", to: "#c5bfb2" },
  { id: "a5", siteId: "aritzia", name: "Boxy pocket tank", brand: "TNA", price: 32, from: "#f2efe9", to: "#d3cdc0" },
  { id: "a6", siteId: "aritzia", name: "Longline tank", brand: "Babaton", price: 45, from: "#efece5", to: "#cec8ba" },
];

/** Canned chat — weighted to what viewers say while someone hunts for a thing. */
export const MOCK_CHAT: { author: string; text: string }[] = [
  { author: "mia", text: "the uniqlo one is $15?? sold" },
  { author: "dev", text: "does the rib one run small" },
  { author: "jules", text: "check cos next" },
  { author: "sam", text: "that's over 40 😭" },
  { author: "ro", text: "need this in white" },
  { author: "kit", text: "pin that pls" },
  { author: "ash", text: "the cropped one!!" },
  { author: "nat", text: "is it see through" },
  { author: "cam", text: "just ordered two 🛒" },
  { author: "lex", text: "what size are you in that" },
  { author: "bee", text: "aritzia always gets me" },
  { author: "tay", text: "go back to everlane" },
];
