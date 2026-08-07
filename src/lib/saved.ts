import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db, products, savedItems, savedShows, streams } from "@/lib/db";
import {
  toDiscoveryShow,
  toProduct,
  upsertProduct,
  type DiscoveryShow,
} from "@/lib/shows";
import type { Product } from "@/lib/types";

/**
 * A viewer's private board — items and shows they saved to come back to.
 *
 * Every function takes `userId` first and scopes its query to it, the same
 * rule the show repository follows: ownership is enforced here rather than
 * trusted from the route handler. Nothing in this module reads ambient auth.
 *
 * The Neon HTTP driver has no interactive transactions, so `saveItem` is two
 * round trips rather than one atomic write. That is fine because both halves
 * are idempotent — a retry converges on the same single row.
 */

/** A saved item, plus where it came from. */
export type SavedProduct = {
  product: Product;
  savedAt: string;
  /** The show it was saved from. Null once that show has been deleted. */
  source: { slug: string; title: string; host: string } | null;
};

/**
 * Saves one item to a user's board.
 *
 * The product is upserted first: during a live show the trail lives only in
 * the stream's snapshot jsonb, so the item being saved may not exist in
 * `products` yet — `persistTrail` does not run until the show ends.
 *
 * Idempotent. Saving something already on the board is a no-op rather than a
 * duplicate or an error, so a double-click costs nothing.
 */
export async function saveItem(
  userId: string,
  item: Product,
  sourceSlug?: string | null,
): Promise<boolean> {
  const productId = await upsertProduct(item);
  if (!productId) return false;

  const sourceStreamId = sourceSlug ? await streamIdForSlug(sourceSlug) : null;

  await db
    .insert(savedItems)
    .values({
      userId,
      productId,
      sourceStreamId,
      note: item.note || null,
    })
    .onConflictDoNothing({
      target: [savedItems.userId, savedItems.productId],
    });

  return true;
}

/**
 * Removes an item from a user's board, addressed by its Channel3 id — that is
 * what the client holds, and it never sees our internal uuids.
 */
export async function unsaveItem(
  userId: string,
  externalId: string,
): Promise<void> {
  const [row] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.externalId, externalId))
    .limit(1);

  if (!row) return;

  await db
    .delete(savedItems)
    .where(
      and(eq(savedItems.userId, userId), eq(savedItems.productId, row.id)),
    );
}

/** The board itself, newest save first. */
export async function listSavedItems(
  userId: string,
): Promise<SavedProduct[]> {
  const rows = await db
    .select({
      product: products,
      note: savedItems.note,
      savedAt: savedItems.createdAt,
      stream: streams,
    })
    .from(savedItems)
    .innerJoin(products, eq(savedItems.productId, products.id))
    .leftJoin(streams, eq(savedItems.sourceStreamId, streams.id))
    .where(eq(savedItems.userId, userId))
    .orderBy(desc(savedItems.createdAt));

  return rows.map((row) => ({
    // The board orders by save time, so that — not the show pin time — is
    // what `addedAt` should carry here.
    product: toProduct(row.product, {
      note: row.note,
      addedAt: row.savedAt.getTime(),
    }),
    savedAt: row.savedAt.toISOString(),
    source: row.stream
      ? {
          slug: row.stream.slug,
          title: row.stream.title,
          host: row.stream.hostName ?? "Host",
        }
      : null,
  }));
}

/**
 * Just the Channel3 ids on the board. What every save button needs to know
 * whether it is filled in, without shipping the whole board to render a page
 * of five toggles.
 */
export async function listSavedProductIds(userId: string): Promise<string[]> {
  const rows = await db
    .select({ externalId: products.externalId })
    .from(savedItems)
    .innerJoin(products, eq(savedItems.productId, products.id))
    .where(eq(savedItems.userId, userId));

  return rows
    .map((row) => row.externalId)
    .filter((id): id is string => Boolean(id));
}

/** Saves a whole show — its entire trail, rather than one item from it. */
export async function saveShow(
  userId: string,
  slug: string,
): Promise<boolean> {
  const streamId = await streamIdForSlug(slug);
  if (!streamId) return false;

  await db
    .insert(savedShows)
    .values({ userId, streamId })
    .onConflictDoNothing({
      target: [savedShows.userId, savedShows.streamId],
    });

  return true;
}

export async function unsaveShow(userId: string, slug: string): Promise<void> {
  const streamId = await streamIdForSlug(slug);
  if (!streamId) return;

  await db
    .delete(savedShows)
    .where(
      and(eq(savedShows.userId, userId), eq(savedShows.streamId, streamId)),
    );
}

/**
 * Saved shows as the same discovery cards browse renders, so the board shows
 * them with the identical mosaic treatment rather than a second card style.
 */
export async function listSavedShows(
  userId: string,
): Promise<DiscoveryShow[]> {
  const rows = await db
    .select({ stream: streams })
    .from(savedShows)
    .innerJoin(streams, eq(savedShows.streamId, streams.id))
    .where(eq(savedShows.userId, userId))
    .orderBy(desc(savedShows.createdAt));

  return rows.map((row) =>
    toDiscoveryShow(row.stream, {
      placeholderLabel: row.stream.status === "live" ? "LIVE" : "REPLAY",
      includeEndedAt: true,
      liveMuxThumbnail: row.stream.status === "live",
    }),
  );
}

export async function listSavedShowSlugs(userId: string): Promise<string[]> {
  const rows = await db
    .select({ slug: streams.slug })
    .from(savedShows)
    .innerJoin(streams, eq(savedShows.streamId, streams.id))
    .where(eq(savedShows.userId, userId));

  return rows.map((row) => row.slug);
}

async function streamIdForSlug(slug: string): Promise<string | null> {
  const [row] = await db
    .select({ id: streams.id })
    .from(streams)
    .where(eq(streams.slug, slug))
    .limit(1);
  return row?.id ?? null;
}
