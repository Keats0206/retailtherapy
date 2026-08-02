import "server-only";

import { unstable_cache } from "next/cache";
import { and, asc, count, desc, eq, sql } from "drizzle-orm";

import { challenges, db, streams } from "@/lib/db";
import type { Challenge } from "@/lib/db";
import { toDiscoveryShow, type DiscoveryShow } from "@/lib/shows";

/**
 * Challenges are brand-sponsored launch events: a budget, a clock, and a store
 * ("15 minutes to spend $500 at Net-a-Porter"). A host goes live to attempt
 * one; the show that results carries `streams.challenge_id` back to it.
 *
 * The rows are curated (see `scripts/seed-challenges.ts`), so everything here
 * is read-only — there is no create/update path in the app yet.
 */

/** Where an event sits relative to now. Derived, never stored. */
export type ChallengeState = "upcoming" | "open" | "closed";

/** A challenge as the browse tab and /c/<slug> render it. */
export type ChallengeCard = {
  slug: string;
  title: string;
  prompt: string;
  brandName: string;
  brandDomain: string | null;
  brandLogoUrl: string | null;
  storeUrl: string | null;
  emoji: string | null;
  /** Major units, for display — the column is minor units. */
  budget: number;
  currency: string;
  durationSeconds: number | null;
  startsAt: string | null;
  endsAt: string | null;
  state: ChallengeState;
  /** Attempts so far, and how many are on air right now. */
  showCount: number;
  liveCount: number;
};

/** A challenge plus the shows recorded against it, for /c/<slug>. */
export type ChallengeDetail = ChallengeCard & {
  liveShows: DiscoveryShow[];
  pastShows: DiscoveryShow[];
};

export function challengeState(
  challenge: Pick<Challenge, "startsAt" | "endsAt">,
  now = new Date(),
): ChallengeState {
  if (challenge.startsAt && challenge.startsAt > now) return "upcoming";
  if (challenge.endsAt && challenge.endsAt < now) return "closed";
  return "open";
}

function toChallengeCard(
  row: Challenge,
  counts: { showCount: number; liveCount: number },
): ChallengeCard {
  return {
    slug: row.slug,
    title: row.title,
    prompt: row.prompt,
    brandName: row.brandName,
    brandDomain: row.brandDomain,
    brandLogoUrl: row.brandLogoUrl,
    storeUrl: row.storeUrl ?? (row.brandDomain ? `https://${row.brandDomain}` : null),
    emoji: row.emoji,
    // The column is minor units; the UI formats dollars.
    budget: row.budgetCents / 100,
    currency: row.currency,
    durationSeconds: row.durationSeconds,
    startsAt: row.startsAt?.toISOString() ?? null,
    endsAt: row.endsAt?.toISOString() ?? null,
    state: challengeState(row),
    showCount: counts.showCount,
    liveCount: counts.liveCount,
  };
}

/**
 * The schedule, as the Challenges tab shows it: open events first (someone can
 * join one right now), then what's coming up, then what has wrapped.
 *
 * Attempt counts come from one grouped join rather than a query per row —
 * this is the first thing rendered on /browse, so it stays a single round trip.
 */
const listChallengesCached = unstable_cache(
  async (limit: number): Promise<ChallengeCard[]> => {
    const rows = await db
      .select({
        challenge: challenges,
        showCount: count(streams.id),
        liveCount: sql<number>`count(*) filter (where ${streams.status} = 'live')::int`,
      })
      .from(challenges)
      .leftJoin(streams, eq(streams.challengeId, challenges.id))
      .where(eq(challenges.isActive, true))
      .groupBy(challenges.id)
      .orderBy(asc(challenges.startsAt), asc(challenges.sortOrder))
      .limit(limit);

    const cards = rows.map((row) =>
      toChallengeCard(row.challenge, {
        showCount: Number(row.showCount),
        liveCount: Number(row.liveCount),
      }),
    );

    // Ordering the states in SQL would mean a case expression that has to stay
    // in step with `challengeState`; sorting the page-sized result here keeps
    // one definition of "now".
    const rank: Record<ChallengeState, number> = {
      open: 0,
      upcoming: 1,
      closed: 2,
    };
    return cards.sort((a, b) => {
      if (rank[a.state] !== rank[b.state]) return rank[a.state] - rank[b.state];
      // Within a state: most attempts first for open events, soonest first for
      // upcoming ones.
      if (a.state === "upcoming") {
        return (a.startsAt ?? "").localeCompare(b.startsAt ?? "");
      }
      return b.liveCount - a.liveCount || b.showCount - a.showCount;
    });
  },
  ["list-challenges"],
  { revalidate: 30 },
);

export async function listChallenges(limit = 12): Promise<ChallengeCard[]> {
  return listChallengesCached(limit);
}

export async function getChallengeBySlug(
  slug: string,
): Promise<ChallengeDetail | null> {
  const [row] = await db
    .select()
    .from(challenges)
    .where(eq(challenges.slug, slug))
    .limit(1);
  if (!row) return null;

  const shows = await db
    .select({
      slug: streams.slug,
      title: streams.title,
      hostName: streams.hostName,
      endedAt: streams.endedAt,
      status: streams.status,
      snapshot: streams.snapshot,
    })
    .from(streams)
    .where(and(eq(streams.challengeId, row.id), sql`${streams.status} <> 'scheduled'`))
    .orderBy(desc(streams.startedAt))
    .limit(24);

  const liveShows = shows
    .filter((show) => show.status === "live")
    .map((show) => toDiscoveryShow(show));
  const pastShows = shows
    .filter((show) => show.status === "ended")
    .map((show) =>
      toDiscoveryShow(show, { placeholderLabel: "RECAP", includeEndedAt: true }),
    );

  return {
    ...toChallengeCard(row, {
      showCount: shows.length,
      liveCount: liveShows.length,
    }),
    liveShows,
    pastShows,
  };
}

/**
 * Resolves the `?challenge=<slug>` hand-off from a challenge card into the id
 * stored on the show. Returns null for an unknown or closed event, so a stale
 * link just starts an ordinary show rather than failing the go-live.
 */
export async function resolveChallengeId(
  slug: string | null | undefined,
): Promise<string | null> {
  if (!slug) return null;
  const [row] = await db
    .select({ id: challenges.id, startsAt: challenges.startsAt, endsAt: challenges.endsAt })
    .from(challenges)
    .where(and(eq(challenges.slug, slug), eq(challenges.isActive, true)))
    .limit(1);
  if (!row) return null;
  return challengeState(row) === "closed" ? null : row.id;
}

/** The badge a show carries when it was recorded for an event. */
export type ShowChallengeBadge = {
  slug: string;
  title: string;
  brandName: string;
  emoji: string | null;
  budget: number;
  currency: string;
  durationSeconds: number | null;
};

export async function getChallengeForShow(
  challengeId: string | null,
): Promise<ShowChallengeBadge | null> {
  if (!challengeId) return null;
  const [row] = await db
    .select({
      slug: challenges.slug,
      title: challenges.title,
      brandName: challenges.brandName,
      emoji: challenges.emoji,
      budgetCents: challenges.budgetCents,
      currency: challenges.currency,
      durationSeconds: challenges.durationSeconds,
    })
    .from(challenges)
    .where(eq(challenges.id, challengeId))
    .limit(1);
  if (!row) return null;

  const { budgetCents, ...rest } = row;
  return { ...rest, budget: budgetCents / 100 };
}
