import type { OutreachCounts } from "@/lib/outreach-status";

export const MAX_SESSION_HOURS = 4;

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

export type SeriesPoint = {
  label: string;
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
