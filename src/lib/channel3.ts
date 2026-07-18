import "server-only";

import { cleanProductTitle } from "@/lib/format";
import type { Availability, Product } from "@/lib/types";

/**
 * Channel3 product lookup. Resolves any supported retailer product URL to a
 * canonical catalog entry with a trackable buy link.
 *
 * Server-only: CHANNEL3_API_KEY must never reach the browser. Callers go
 * through POST /api/products/lookup.
 *
 * Docs: https://docs.trychannel3.com/api-reference/v1/lookup-product
 */

const LOOKUP_ENDPOINT = "https://api.trychannel3.com/v1/lookup";

/** Subset of the Channel3 response we actually consume. */
interface Channel3Image {
  url: string;
  is_main_image: boolean;
}

interface Channel3Offer {
  url: string;
  domain: string;
  price: {
    price: number;
    compare_at_price: number | null;
    currency: string;
  } | null;
  availability: Availability | null;
  /** Fraction, NOT a percent: 0.04 means 4%. */
  max_commission_rate: number | null;
}

interface Channel3Product {
  id: string;
  title: string;
  description: string | null;
  brands: Array<{ id: string; name: string }> | null;
  images: Channel3Image[] | null;
  offers: Channel3Offer[] | null;
}

export class LookupError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "LookupError";
    this.status = status;
  }
}

export function isChannel3Configured(): boolean {
  return Boolean(process.env.CHANNEL3_API_KEY);
}

/** Maps upstream error codes to messages worth showing a host mid-stream. */
function messageForStatus(status: number, detail: string | undefined): string {
  switch (status) {
    case 401:
      return "Channel3 rejected the API key.";
    case 402:
      return "Channel3 credits exhausted.";
    case 404:
      return "Channel3 doesn't have that product.";
    case 422:
      return "That URL isn't a product page.";
    case 504:
      return "Channel3 timed out — try again.";
    default:
      return detail || "Couldn't resolve that URL.";
  }
}

export async function lookupProduct(rawUrl: string): Promise<Product> {
  const apiKey = process.env.CHANNEL3_API_KEY;
  if (!apiKey) {
    throw new LookupError("CHANNEL3_API_KEY is not set.", 501);
  }

  const url = rawUrl.trim();
  if (!/^https?:\/\//i.test(url)) {
    throw new LookupError("Enter a full product URL starting with https://", 400);
  }

  let res: Response;
  try {
    res = await fetch(LOOKUP_ENDPOINT, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
      // Prices and availability go stale; never cache a lookup.
      cache: "no-store",
    });
  } catch {
    throw new LookupError("Couldn't reach Channel3.", 502);
  }

  if (!res.ok) {
    let detail: string | undefined;
    try {
      detail = ((await res.json()) as { detail?: string }).detail;
    } catch {
      // Non-JSON error body; fall back to the status-based message.
    }
    throw new LookupError(messageForStatus(res.status, detail), res.status);
  }

  const body = (await res.json()) as { product?: Channel3Product };
  if (!body.product) {
    throw new LookupError("Channel3 returned no product.", 502);
  }

  return mapProduct(body.product);
}

function mapProduct(p: Channel3Product): Product {
  // Offers are ordered best-first; the top one carries the trackable link.
  const offer = p.offers?.[0] ?? null;
  const image =
    p.images?.find((i) => i.is_main_image) ?? p.images?.[0] ?? null;

  // Real responses return brands: [] for plenty of retailers, so the offer
  // domain is the more reliable label.
  const retailer = offer?.domain ?? p.brands?.[0]?.name ?? "";

  return {
    id: p.id,
    name: cleanProductTitle(p.title, retailer),
    imageUrl: image?.url ?? null,
    price: offer?.price?.price ?? 0,
    currency: offer?.price?.currency ?? "USD",
    retailer,
    buyUrl: offer?.url ?? "",
    // 0.04 -> 4. Rounded to one decimal so 0.045 shows as 4.5%, not 4.5000001%.
    commissionRate:
      offer?.max_commission_rate != null
        ? Math.round(offer.max_commission_rate * 1000) / 10
        : 0,
    availability: offer?.availability ?? null,
    note: "",
    addedAt: Date.now(),
  };
}
