import "server-only";

import { sql } from "drizzle-orm";

import { countProspectsByStatus } from "@/lib/creator-outreach";
import { db } from "@/lib/db";
import { getMetricsExcludedHostIds } from "@/lib/excluded-hosts";
import type { OutreachCounts } from "@/lib/outreach-status";
import { streamProducts, streams, waitlistSignups } from "@/lib/db/schema";
import type { StreamSnapshot } from "@/lib/stream-store";

/**
 * Platform metrics for /admin/metrics, with **creator hours** as the headline.
 *
 * Everything is derived from `streams` — there is no separate analytics store
 * and no users table, so a creator is a Clerk `host_user_id` and a session is
 * one row. Three caveats shape the math:
 *
 * 1. `endStaleShows()` ends an abandoned show at *sweep time*, not last
 *    activity, and `endShow()` overwrites `updated_at` — so the 30s heartbeat
 *    is gone by the time we read the row. A host who closed the tab can look
 *    like a 3h session. Every session is therefore capped at
 *    `MAX_SESSION_HOURS`, and `cappedSessions` reports how often that bit.
 * 2. `started_at` is written when the show is created, before the camera
 *    connects. These are "studio open" hours, not verified broadcast hours.
 * 3. A show's hours land in the bucket its `started_at` falls in; sessions that
 *    straddle a boundary are not split. At a 4h cap the skew is negligible.
 *
 * Aggregation happens in TypeScript over a full table read, which is honest at
 * the current row count and keeps the cap and the still-live branch in one
 * place. If `streams` passes a few thousand rows, push the bucketing into SQL.
 */

export const MAX_SESSION_HOURS = 4;

/**
 * Hosts whose shows never count. `npm run smoke` writes a real `streams` row
 * as `smoke-test-user` against the same database, and because that row is
 * abandoned rather than ended it lands at the full session cap every time —
 * enough to dominate the headline. See `lib/excluded-hosts.ts` for the full
 * allowlist and env vars.
 */

const MAX_SESSION_MS = MAX_SESSION_HOURS * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

export type MetricsRange = "30d" | "12w" | "all";

export const METRICS_RANGES: readonly MetricsRange[] = ["30d", "12w", "all"];

export const RANGE_LABELS: Record<MetricsRange, string> = {
  "30d": "30 days",
  "12w": "12 weeks",
  all: "All time",
};

export function parseRange(value: string | string[] | undefined): MetricsRange {
  const raw = Array.isArray(value) ? value[0] : value;
  return METRICS_RANGES.includes(raw as MetricsRange)
    ? (raw as MetricsRange)
    : "30d";
}

/** The columns creator hours actually needs. */
type SessionRow = {
  id: string;
  hostUserId: string;
  hostName: string | null;
  status: "scheduled" | "live" | "ended";
  startedAt: Date | null;
  endedAt: Date | null;
  // Read straight off the row rather than through `snapshotOf` — only
  // `stats` is needed here, so the trail/vote normalization would be waste.
  snapshot: StreamSnapshot | null;
};

/**
 * Wall-clock length of one session, uncapped. A show still live counts up to
 * `now`; a show that never started counts zero.
 */
export function rawSessionDurationMs(
  show: Pick<SessionRow, "status" | "startedAt" | "endedAt">,
  now: number = Date.now(),
): number {
  if (!show.startedAt) return 0;
  const end =
    show.status === "live" ? now : (show.endedAt?.getTime() ?? show.startedAt.getTime());
  return Math.max(0, end - show.startedAt.getTime());
}

/**
 * The session length we count — `rawSessionDurationMs` clamped to
 * `MAX_SESSION_HOURS`. Use this everywhere hours are summed.
 */
export function sessionDurationMs(
  show: Pick<SessionRow, "status" | "startedAt" | "endedAt">,
  now: number = Date.now(),
): number {
  return Math.min(rawSessionDurationMs(show, now), MAX_SESSION_MS);
}

export type SeriesPoint = {
  /** Short axis label, e.g. "Jul 3". */
  label: string;
  /** Tooltip label, e.g. "Week of Jul 3". */
  fullLabel: string;
  start: string;
  hours: number;
  shows: number;
  creators: number;
  newCreators: number;
  signups: number;
};

export type CreatorRow = {
  hostUserId: string;
  hostName: string;
  hours: number;
  shows: number;
  avgSessionMinutes: number;
  firstShowAt: string | null;
  lastLiveAt: string | null;
  liveNow: boolean;
};

export type MetricsSummary = {
  range: MetricsRange;
  generatedAt: string;
  rangeStart: string;
  totals: {
    hoursAllTime: number;
    hoursInRange: number;
    hoursPrevPeriod: number | null;
    hoursDeltaPct: number | null;
    showsAllTime: number;
    showsInRange: number;
    creatorsAllTime: number;
    creatorsInRange: number;
    newCreatorsInRange: number;
    liveNow: number;
    cappedSessions: number;
    avgSessionMinutes: number;
    /** Shows dropped as test-account noise — see `excludedHostIds`. */
    excludedShows: number;
  };
  series: SeriesPoint[];
  creators: CreatorRow[];
  engagement: {
    showsWithStats: number;
    peakViewers: number;
    chatMessages: number;
    avgPeakViewers: number;
    avgChatMessages: number;
    productsPinned: number;
    avgProductsPerShow: number;
    buyVotes: number;
    skipVotes: number;
    /** Share of product votes that were "buy", 0–1, or null with no votes. */
    buyShare: number | null;
  };
  funnel: {
    signupsAllTime: number;
    signupsInRange: number;
    signupsWithAccount: number;
    signupsConverted: number;
    conversionPct: number | null;
    prospects: OutreachCounts;
    prospectTotal: number;
  };
};

type Bucket = {
  key: string;
  start: Date;
  label: string;
  fullLabel: string;
};

export async function getMetrics(
  range: MetricsRange = "30d",
): Promise<MetricsSummary> {
  const now = new Date();
  const nowMs = now.getTime();

  const [sessions, productAgg, signups, prospects] = await Promise.all([
    db
      .select({
        id: streams.id,
        hostUserId: streams.hostUserId,
        hostName: streams.hostName,
        status: streams.status,
        startedAt: streams.startedAt,
        endedAt: streams.endedAt,
        snapshot: streams.snapshot,
      })
      .from(streams),
    db
      .select({
        streamId: streamProducts.streamId,
        products: sql<number>`count(*)::int`,
        buyVotes: sql<number>`coalesce(sum(${streamProducts.buyVotes}), 0)::int`,
        skipVotes: sql<number>`coalesce(sum(${streamProducts.skipVotes}), 0)::int`,
      })
      .from(streamProducts)
      .groupBy(streamProducts.streamId),
    db
      .select({
        userId: waitlistSignups.userId,
        createdAt: waitlistSignups.createdAt,
      })
      .from(waitlistSignups),
    countProspectsByStatus(),
  ]);

  // Only sessions that actually started are creator hours. A "scheduled" row
  // that never went live has no start and would otherwise read as zero-length
  // noise in the show counts.
  const excluded = getMetricsExcludedHostIds();
  const started = sessions.filter(
    (s): s is SessionRow & { startedAt: Date } =>
      s.startedAt !== null && !excluded.has(s.hostUserId),
  );
  const excludedShows = sessions.filter(
    (s) => s.startedAt !== null && excluded.has(s.hostUserId),
  ).length;
  started.sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());

  const rangeStart = rangeStartFor(range, now, started[0]?.startedAt ?? now);
  const inRange = started.filter((s) => s.startedAt >= rangeStart);

  const buckets = buildBuckets(range, now, rangeStart);
  const bucketIndex = new Map(buckets.map((b, i) => [b.key, i]));

  // First-ever show per creator drives both the leaderboard and "new creators".
  const firstShowAt = new Map<string, Date>();
  const lastShowAt = new Map<string, Date>();
  for (const s of started) {
    if (!firstShowAt.has(s.hostUserId)) firstShowAt.set(s.hostUserId, s.startedAt);
    lastShowAt.set(s.hostUserId, s.startedAt);
  }

  const series: SeriesPoint[] = buckets.map((b) => ({
    label: b.label,
    fullLabel: b.fullLabel,
    start: b.start.toISOString(),
    hours: 0,
    shows: 0,
    creators: 0,
    newCreators: 0,
    signups: 0,
  }));
  const bucketCreators = buckets.map(() => new Set<string>());

  let cappedSessions = 0;
  let hoursAllTime = 0;
  let hoursInRange = 0;
  let hoursPrev = 0;
  const prevStart = previousPeriodStart(range, rangeStart);

  for (const s of started) {
    const ms = sessionDurationMs(s, nowMs);
    if (rawSessionDurationMs(s, nowMs) > MAX_SESSION_MS) cappedSessions += 1;
    hoursAllTime += ms / HOUR_MS;

    if (prevStart && s.startedAt >= prevStart && s.startedAt < rangeStart) {
      hoursPrev += ms / HOUR_MS;
    }
    if (s.startedAt < rangeStart) continue;

    hoursInRange += ms / HOUR_MS;
    const i = bucketIndex.get(bucketKey(range, s.startedAt));
    if (i === undefined) continue;
    series[i].hours += ms / HOUR_MS;
    series[i].shows += 1;
    bucketCreators[i].add(s.hostUserId);
    if (firstShowAt.get(s.hostUserId)?.getTime() === s.startedAt.getTime()) {
      series[i].newCreators += 1;
    }
  }

  for (const [i, set] of bucketCreators.entries()) series[i].creators = set.size;

  for (const signup of signups) {
    const i = bucketIndex.get(bucketKey(range, signup.createdAt));
    if (i !== undefined && signup.createdAt >= rangeStart) series[i].signups += 1;
  }

  // Leaderboard reflects the selected range; "first live" stays all-time so a
  // creator's tenure is visible even when the window is short.
  const byCreator = new Map<string, { hours: number; shows: number; name: string | null; live: boolean }>();
  for (const s of inRange) {
    const entry = byCreator.get(s.hostUserId) ?? {
      hours: 0,
      shows: 0,
      name: null,
      live: false,
    };
    entry.hours += sessionDurationMs(s, nowMs) / HOUR_MS;
    entry.shows += 1;
    // `started` is oldest-first, so the last name wins — the most recent one.
    entry.name = s.hostName ?? entry.name;
    entry.live ||= s.status === "live";
    byCreator.set(s.hostUserId, entry);
  }

  const creators: CreatorRow[] = [...byCreator.entries()]
    .map(([hostUserId, entry]) => ({
      hostUserId,
      hostName: entry.name ?? "Unnamed host",
      hours: round(entry.hours, 1),
      shows: entry.shows,
      avgSessionMinutes: Math.round((entry.hours * 60) / Math.max(1, entry.shows)),
      firstShowAt: firstShowAt.get(hostUserId)?.toISOString() ?? null,
      lastLiveAt: lastShowAt.get(hostUserId)?.toISOString() ?? null,
      liveNow: entry.live,
    }))
    .sort((a, b) => b.hours - a.hours);

  const newCreatorsInRange = [...firstShowAt.values()].filter(
    (d) => d >= rangeStart,
  ).length;

  // Engagement, scoped to shows started in range.
  const productsByStream = new Map(productAgg.map((r) => [r.streamId, r]));
  let peakViewers = 0;
  let chatMessages = 0;
  let showsWithStats = 0;
  let productsPinned = 0;
  let buyVotes = 0;
  let skipVotes = 0;

  for (const s of inRange) {
    const stats = s.snapshot?.stats;
    if (stats) {
      showsWithStats += 1;
      peakViewers += stats.peakViewers;
      chatMessages += stats.chatCount;
    }
    const agg = productsByStream.get(s.id);
    if (agg) {
      productsPinned += agg.products;
      buyVotes += agg.buyVotes;
      skipVotes += agg.skipVotes;
    }
  }

  const totalVotes = buyVotes + skipVotes;
  const hostIds = new Set(started.map((s) => s.hostUserId));
  const signupsInRange = signups.filter((s) => s.createdAt >= rangeStart).length;
  const signupsWithAccount = signups.filter((s) => s.userId).length;
  const signupsConverted = signups.filter(
    (s) => s.userId && hostIds.has(s.userId),
  ).length;

  return {
    range,
    generatedAt: now.toISOString(),
    rangeStart: rangeStart.toISOString(),
    totals: {
      hoursAllTime: round(hoursAllTime, 1),
      hoursInRange: round(hoursInRange, 1),
      hoursPrevPeriod: prevStart ? round(hoursPrev, 1) : null,
      hoursDeltaPct:
        prevStart && hoursPrev > 0
          ? round(((hoursInRange - hoursPrev) / hoursPrev) * 100, 0)
          : null,
      showsAllTime: started.length,
      showsInRange: inRange.length,
      creatorsAllTime: firstShowAt.size,
      creatorsInRange: byCreator.size,
      newCreatorsInRange,
      liveNow: started.filter((s) => s.status === "live").length,
      cappedSessions,
      avgSessionMinutes: Math.round(
        (hoursInRange * 60) / Math.max(1, inRange.length),
      ),
      excludedShows,
    },
    series,
    creators,
    engagement: {
      showsWithStats,
      peakViewers,
      chatMessages,
      avgPeakViewers: Math.round(peakViewers / Math.max(1, showsWithStats)),
      avgChatMessages: Math.round(chatMessages / Math.max(1, showsWithStats)),
      productsPinned,
      avgProductsPerShow: round(productsPinned / Math.max(1, inRange.length), 1),
      buyVotes,
      skipVotes,
      buyShare: totalVotes > 0 ? buyVotes / totalVotes : null,
    },
    funnel: {
      signupsAllTime: signups.length,
      signupsInRange,
      signupsWithAccount,
      signupsConverted,
      conversionPct:
        signups.length > 0
          ? round((signupsConverted / signups.length) * 100, 0)
          : null,
      prospects,
      prospectTotal: Object.values(prospects).reduce((a, b) => a + b, 0),
    },
  };
}

// --- bucketing -------------------------------------------------------------
//
// Buckets are keyed by a string rather than an index offset so DST-shifted days
// and uneven months can't drift the arithmetic.

function bucketKey(range: MetricsRange, date: Date): string {
  if (range === "30d") return isoDay(startOfDay(date));
  if (range === "12w") return isoDay(startOfWeek(date));
  return `${date.getFullYear()}-${date.getMonth()}`;
}

function buildBuckets(range: MetricsRange, now: Date, rangeStart: Date): Bucket[] {
  const buckets: Bucket[] = [];

  if (range === "30d") {
    for (let cursor = startOfDay(rangeStart); cursor <= now; cursor = addDays(cursor, 1)) {
      buckets.push({
        key: isoDay(cursor),
        start: cursor,
        label: shortDate(cursor),
        fullLabel: longDate(cursor),
      });
    }
    return buckets;
  }

  if (range === "12w") {
    for (let cursor = startOfWeek(rangeStart); cursor <= now; cursor = addDays(cursor, 7)) {
      buckets.push({
        key: isoDay(cursor),
        start: cursor,
        label: shortDate(cursor),
        fullLabel: `Week of ${longDate(cursor)}`,
      });
    }
    return buckets;
  }

  for (
    let cursor = startOfMonth(rangeStart);
    cursor <= now;
    cursor = addMonths(cursor, 1)
  ) {
    buckets.push({
      key: `${cursor.getFullYear()}-${cursor.getMonth()}`,
      start: cursor,
      label: cursor.toLocaleDateString("en-US", { month: "short" }),
      fullLabel: cursor.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
    });
  }
  return buckets;
}

function rangeStartFor(range: MetricsRange, now: Date, earliest: Date): Date {
  if (range === "30d") return startOfDay(addDays(now, -29));
  if (range === "12w") return startOfWeek(addDays(now, -7 * 11));
  return startOfMonth(earliest);
}

/** The equivalent window immediately before `rangeStart`, or null for "all". */
function previousPeriodStart(range: MetricsRange, rangeStart: Date): Date | null {
  if (range === "30d") return addDays(rangeStart, -30);
  if (range === "12w") return addDays(rangeStart, -7 * 12);
  return null;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  // Monday-start: Sunday (0) becomes 6.
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

function startOfMonth(d: Date): Date {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function addMonths(d: Date, months: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + months);
  return x;
}

function isoDay(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function shortDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function longDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}

function round(n: number, places: number): number {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}
