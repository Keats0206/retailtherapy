import type { Creator, Product, Session } from "./types";

export const CREATOR_HANDLE = "peter";

export const mockCreator: Creator = {
  id: "creator_peter",
  handle: CREATOR_HANDLE,
  name: "Peter Keating",
  avatarUrl:
    "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=200&h=200&fit=crop",
  bio: "Shopping the SSENSE sale, vintage watches, and date-night fits — live.",
  followers: 4213,
  // ~2 days out
  upcomingStreamAt: new Date(Date.now() + 1000 * 60 * 60 * 44).toISOString(),
};

export function makeSession(): Session {
  return {
    id: "session_1",
    creatorId: mockCreator.id,
    title: "Shopping the SSENSE sale live",
    status: "idle",
    startedAt: null,
    endedAt: null,
    recordingUrl: null,
  };
}

/**
 * Seed product catalog keyed loosely by URL host. lookupProduct() matches against
 * these; anything unrecognized gets a plausible generated product so the "paste any
 * URL" flow always works in the prototype.
 */
export const seedProducts: Omit<
  Product,
  "verdict" | "note" | "pinned" | "clicks" | "votes" | "addedAt"
>[] = [
  {
    id: "prod_acne_jacket",
    name: "Acne Studios Wool Jacket",
    imageUrl:
      "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&h=600&fit=crop",
    price: 425,
    currency: "USD",
    retailer: "SSENSE",
    url: "https://www.ssense.com/en-us/men/product/acne-studios/wool-jacket/1",
    affiliateUrl: "https://track.channel3.mock/o/prod_acne_jacket",
    commissionRate: 8,
  },
  {
    id: "prod_ragbone_jacket",
    name: "Rag & Bone Field Jacket",
    imageUrl:
      "https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=600&h=600&fit=crop",
    price: 495,
    currency: "USD",
    retailer: "rag-bone.com",
    url: "https://www.rag-bone.com/field-jacket/2",
    affiliateUrl: "https://track.channel3.mock/o/prod_ragbone_jacket",
    commissionRate: 8,
  },
  {
    id: "prod_common_shoes",
    name: "Common Projects Achilles Low",
    imageUrl:
      "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&h=600&fit=crop",
    price: 411,
    currency: "USD",
    retailer: "SSENSE",
    url: "https://www.ssense.com/en-us/men/product/common-projects/achilles/3",
    affiliateUrl: "https://track.channel3.mock/o/prod_common_shoes",
    commissionRate: 10,
  },
  {
    id: "prod_seiko_watch",
    name: "Seiko Presage Vintage Automatic",
    imageUrl:
      "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=600&h=600&fit=crop",
    price: 625,
    currency: "USD",
    retailer: "Hodinkee Shop",
    url: "https://shop.hodinkee.com/products/seiko-presage/4",
    affiliateUrl: "https://track.channel3.mock/o/prod_seiko_watch",
    commissionRate: 6,
  },
  {
    id: "prod_leather_bag",
    name: "Lemaire Croissant Leather Bag",
    imageUrl:
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=600&h=600&fit=crop",
    price: 890,
    currency: "USD",
    retailer: "SSENSE",
    url: "https://www.ssense.com/en-us/women/product/lemaire/croissant-bag/5",
    affiliateUrl: "https://track.channel3.mock/o/prod_leather_bag",
    commissionRate: 8,
  },
  {
    id: "prod_wool_sweater",
    name: "COS Chunky Wool Sweater",
    imageUrl:
      "https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=600&h=600&fit=crop",
    price: 135,
    currency: "USD",
    retailer: "cos.com",
    url: "https://www.cos.com/en_usd/sweater/6",
    affiliateUrl: "https://track.channel3.mock/o/prod_wool_sweater",
    commissionRate: 5,
  },
];

/** Ambient chat used while a session is live, to make the room feel populated. */
export const botChatter: string[] = [
  "Try the black one 🖤",
  "is this worth $200??",
  "the cut on that is insane",
  "wait for the sale imo",
  "size up or true to size?",
  "just copped 🔥",
  "peter has taste fr",
  "link pls 🙏",
  "skip, overpriced",
  "the watch >>> everything",
  "date night fit incoming",
  "add the sweater back!!",
  "how tall are you for reference",
  "10/10 would wear",
  "buy buy buy",
];

export const botNames: string[] = [
  "maya",
  "devon",
  "sasha_k",
  "jorge",
  "lin",
  "theo",
  "priya",
  "quinn",
];
