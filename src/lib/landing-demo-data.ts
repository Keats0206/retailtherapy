import type { Product } from "@/lib/types";

export const LANDING_HOST_IMAGE = "/landing/demo-host.svg";

export type DemoPhase =
  | "pinning"
  | "voting"
  | "chatting"
  | "hold"
  | "transition";

export const DEMO_PHASE_MS: Record<DemoPhase, number> = {
  pinning: 4000,
  voting: 3000,
  chatting: 2000,
  hold: 1000,
  transition: 1000,
};

export const DEMO_PHASE_ORDER: DemoPhase[] = [
  "pinning",
  "voting",
  "chatting",
  "hold",
  "transition",
];

export type DemoChatLine = {
  text: string;
  /** Ms after chatting phase starts */
  delayMs: number;
};

export type LandingDemoProduct = Product & {
  voteTarget: { buy: number; skip: number; buyPct: number };
  chatLines: DemoChatLine[];
};

const SESSION_START = 1_760_000_000_000;

export const LANDING_DEMO_PRODUCTS: LandingDemoProduct[] = [
  {
    id: "landing-sweater",
    name: "Merino Crew Neck Sweater",
    imageUrl: "/landing/demo-sweater.svg",
    price: 49.9,
    currency: "USD",
    retailer: "uniqlo.com",
    buyUrl: "#",
    commissionRate: 4,
    availability: "InStock",
    note: "Runs small — size up if you're between.",
    addedAt: SESSION_START,
    voteTarget: { buy: 68, skip: 32, buyPct: 68 },
    chatLines: [
      { text: "need this", delayMs: 0 },
      { text: "what color?", delayMs: 600 },
      { text: "too much?", delayMs: 1200 },
    ],
  },
  {
    id: "landing-balm",
    name: "Hydrating Lip Balm Duo",
    imageUrl: "/landing/demo-lip-balm.svg",
    price: 24,
    currency: "USD",
    retailer: "sephora.com",
    buyUrl: "#",
    commissionRate: 6,
    availability: "InStock",
    note: "",
    addedAt: SESSION_START + 60_000,
    voteTarget: { buy: 54, skip: 46, buyPct: 54 },
    chatLines: [
      { text: "wait that's cute", delayMs: 0 },
      { text: "link?", delayMs: 700 },
      { text: "sold out already?", delayMs: 1300 },
    ],
  },
  {
    id: "landing-sneakers",
    name: "Classic Low Sneaker",
    imageUrl: "/landing/demo-sneakers.svg",
    price: 98,
    currency: "USD",
    retailer: "nike.com",
    buyUrl: "#",
    commissionRate: 5,
    availability: "InStock",
    note: "True to size.",
    addedAt: SESSION_START + 120_000,
    voteTarget: { buy: 72, skip: 28, buyPct: 72 },
    chatLines: [
      { text: "fire", delayMs: 0 },
      { text: "cop or skip", delayMs: 500 },
      { text: "room says buy", delayMs: 1100 },
    ],
  },
];

export const DEMO_VIEWER_COUNT = { start: 812, end: 847 };

/** Preload hero visuals for LCP. */
export const LANDING_PRELOAD_IMAGES = [
  "/landing/demo-store.png",
  LANDING_HOST_IMAGE,
  LANDING_DEMO_PRODUCTS[0]!.imageUrl!,
];
