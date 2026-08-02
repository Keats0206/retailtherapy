import { auth } from "@clerk/nextjs/server";

import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { listSavedItems, saveItem, unsaveItem } from "@/lib/saved";
import type { Product } from "@/lib/types";

/**
 * A signed-in viewer's board of saved items.
 *
 * Keyed on the Clerk user id rather than an IP: these are all authenticated
 * calls, and the board is per-account, so that is also the right rate-limit
 * bucket.
 *
 * Products are addressed by their Channel3 id (`Product.id`) throughout. The
 * client never sees our internal uuids.
 */

const MAX_TEXT = 500;

function limitFor(userId: string, limit: number) {
  return checkRateLimit(`saved:${userId}`, { limit, windowMs: 60_000 });
}

/** GET /api/saved/items — the whole board, newest first. */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const limit = limitFor(userId, 60);
  if (!limit.ok) return rateLimitResponse(limit.retryAfterSec ?? 60);

  try {
    const items = await listSavedItems(userId);
    return Response.json({ items });
  } catch (err) {
    console.error("[saved] list failed", err);
    return Response.json({ error: "Couldn't load your saves" }, { status: 500 });
  }
}

/** POST /api/saved/items — save one item, optionally noting the show. */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const limit = limitFor(userId, 60);
  if (!limit.ok) return rateLimitResponse(limit.retryAfterSec ?? 60);

  let body: { product?: unknown; sourceSlug?: unknown };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  // The client posts the product it has in hand, so the shape is validated
  // here rather than trusted — this row outlives the show that produced it.
  const product = normalizeProduct(body.product);
  if (!product) {
    return Response.json({ error: "Invalid product" }, { status: 400 });
  }

  const sourceSlug =
    typeof body.sourceSlug === "string" ? body.sourceSlug.slice(0, 64) : null;

  try {
    const saved = await saveItem(userId, product, sourceSlug);
    if (!saved) {
      return Response.json({ error: "Invalid product" }, { status: 400 });
    }
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[saved] save failed", err);
    return Response.json({ error: "Couldn't save that item" }, { status: 500 });
  }
}

/** DELETE /api/saved/items — remove one item by its Channel3 id. */
export async function DELETE(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const limit = limitFor(userId, 60);
  if (!limit.ok) return rateLimitResponse(limit.retryAfterSec ?? 60);

  let body: { id?: unknown };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  try {
    await unsaveItem(userId, id);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[saved] unsave failed", err);
    return Response.json({ error: "Couldn't remove that item" }, { status: 500 });
  }
}

/**
 * Coerces an untrusted payload into a `Product`. Returns null unless the three
 * fields that make a save worth having are present: an id to dedupe on, a name
 * to show, and a link to buy through.
 */
function normalizeProduct(input: unknown): Product | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;

  const id = str(raw.id, 128);
  const name = str(raw.name, MAX_TEXT);
  const buyUrl = str(raw.buyUrl, 2048);
  if (!id || !name || !buyUrl) return null;

  const price = Number(raw.price);

  return {
    id,
    name,
    imageUrl: str(raw.imageUrl, 2048) || null,
    price: Number.isFinite(price) && price >= 0 ? price : 0,
    currency: str(raw.currency, 8) || "usd",
    retailer: str(raw.retailer, 128),
    buyUrl,
    commissionRate: 0,
    availability:
      raw.availability === "InStock" || raw.availability === "OutOfStock"
        ? raw.availability
        : null,
    note: str(raw.note, MAX_TEXT),
    addedAt: Date.now(),
  };
}

function str(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
