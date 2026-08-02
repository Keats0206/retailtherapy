import "server-only";

import { and, eq } from "drizzle-orm";

import { db, hostFeedback, streams } from "@/lib/db";

export const MIN_RATING = 1;
export const MAX_RATING = 5;

export type HostFeedbackAnswer = {
  rating: number;
  note: string | null;
};

export function isValidRating(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= MIN_RATING &&
    value <= MAX_RATING
  );
}

/**
 * Record (or correct) how the host felt about a show they hosted.
 *
 * Scoped by `hostUserId` in the lookup rather than checked afterwards, so a
 * signed-in user cannot rate someone else's show by guessing its slug. Returns
 * null when the show doesn't exist or isn't theirs — the route turns that into
 * a 404 rather than distinguishing the two.
 */
export async function saveHostFeedback(
  slug: string,
  hostUserId: string,
  answer: HostFeedbackAnswer,
): Promise<HostFeedbackAnswer | null> {
  const [show] = await db
    .select({ id: streams.id })
    .from(streams)
    .where(and(eq(streams.slug, slug), eq(streams.hostUserId, hostUserId)))
    .limit(1);

  if (!show) return null;

  const note = answer.note?.trim().slice(0, 2000) || null;

  await db
    .insert(hostFeedback)
    .values({
      streamId: show.id,
      hostUserId,
      rating: answer.rating,
      note,
    })
    .onConflictDoUpdate({
      target: hostFeedback.streamId,
      set: { rating: answer.rating, note, updatedAt: new Date() },
    });

  return { rating: answer.rating, note };
}

/** The host's own answer for a show, or null if they haven't given one. */
export async function getHostFeedback(
  slug: string,
  hostUserId: string,
): Promise<HostFeedbackAnswer | null> {
  const [row] = await db
    .select({ rating: hostFeedback.rating, note: hostFeedback.note })
    .from(hostFeedback)
    .innerJoin(streams, eq(streams.id, hostFeedback.streamId))
    .where(and(eq(streams.slug, slug), eq(streams.hostUserId, hostUserId)))
    .limit(1);

  return row ?? null;
}
