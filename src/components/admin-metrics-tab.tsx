"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { BarChart } from "@/components/metrics/bar-chart";
import { LeaderboardTable } from "@/components/metrics/leaderboard-table";
import { LineChart } from "@/components/metrics/line-chart";
import { SplitMeter } from "@/components/metrics/split-meter";
import { StatTile } from "@/components/metrics/stat-tile";
import { Button } from "@/components/ui/button";
import { readResponseJson } from "@/lib/fetch-json";
import {
  MAX_SESSION_HOURS,
  METRICS_RANGES,
  RANGE_LABELS,
  type MetricsRange,
  type MetricsSummary,
} from "@/lib/metrics-shared";
import { OUTREACH_STATUSES, OUTREACH_STATUS_LABELS } from "@/lib/outreach-status";
import { cn } from "@/lib/utils";

function hours(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n >= 100 ? String(Math.round(n)) : String(Math.round(n * 10) / 10);
}

function count(n: number): string {
  return n.toLocaleString("en-US");
}

function AdminMetricsSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
      <Loader2 className="size-5 animate-spin" />
      <p className="text-sm">Loading metrics…</p>
    </div>
  );
}

export function AdminMetricsTab({
  initialRange = "30d",
  onOpenOutreach,
}: {
  initialRange?: MetricsRange;
  onOpenOutreach?: () => void;
}) {
  const [range, setRange] = useState<MetricsRange>(initialRange);
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchMetrics() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/metrics?range=${range}`);
        const data = await readResponseJson<MetricsSummary & { error?: string }>(
          res,
        );
        if (!res.ok) {
          throw new Error(data.error ?? "Failed to load metrics");
        }
        if (!cancelled) {
          setMetrics(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Something went wrong");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchMetrics();
    return () => {
      cancelled = true;
    };
  }, [range]);

  function selectRange(nextRange: MetricsRange) {
    if (nextRange !== range) {
      setRange(nextRange);
    }
  }

  if (loading && !metrics) {
    return <AdminMetricsSkeleton />;
  }

  if (error && !metrics) {
    return (
      <p className="py-12 text-sm text-destructive" role="alert">
        {error}
      </p>
    );
  }

  if (!metrics) return null;

  const { totals, series, engagement, funnel } = metrics;
  const rangeLabel = RANGE_LABELS[range].toLowerCase();

  const hoursSeries = series.map((p) => ({
    label: p.label,
    fullLabel: p.fullLabel,
    value: p.hours,
  }));
  const showsSeries = series.map((p) => ({
    label: p.label,
    fullLabel: p.fullLabel,
    value: p.shows,
  }));
  const newCreatorsSeries = series.map((p) => ({
    label: p.label,
    fullLabel: p.fullLabel,
    value: p.newCreators,
  }));
  const signupSeries = series.map((p) => ({
    label: p.label,
    fullLabel: p.fullLabel,
    value: p.signups,
  }));

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {METRICS_RANGES.map((option) => (
          <Button
            key={option}
            type="button"
            variant={option === range ? "default" : "outline"}
            size="sm"
            aria-current={option === range ? "page" : undefined}
            disabled={loading}
            onClick={() => selectRange(option)}
          >
            {RANGE_LABELS[option]}
          </Button>
        ))}
        {loading ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        ) : null}
      </div>

      <section className="flex flex-col gap-6 border-t border-border pt-8">
        <h2 className="micro text-muted-foreground">Creator hours</h2>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label={`Hours · ${RANGE_LABELS[range]}`}
            value={hours(totals.hoursInRange)}
            deltaPct={totals.hoursDeltaPct}
            hint={
              totals.hoursPrevPeriod !== null
                ? `${hours(totals.hoursPrevPeriod)} in the previous ${rangeLabel}`
                : undefined
            }
          />
          <StatTile
            label="Hours · all time"
            value={hours(totals.hoursAllTime)}
            hint={`${count(totals.showsAllTime)} shows since launch`}
          />
          <StatTile
            label="Avg session"
            value={`${totals.avgSessionMinutes}m`}
            hint={`Across ${count(totals.showsInRange)} shows`}
          />
          <StatTile
            label="Live right now"
            value={count(totals.liveNow)}
            hint={
              totals.cappedSessions > 0
                ? `${count(totals.cappedSessions)} session${totals.cappedSessions === 1 ? "" : "s"} hit the ${MAX_SESSION_HOURS}h cap`
                : undefined
            }
          />
        </div>

        <BarChart data={hoursSeries} formatValue={hours} />

        <p className="text-xs leading-relaxed text-muted-foreground">
          An hour is counted from when a host opens the studio to when the show
          ends, so it measures studio-open time rather than verified broadcast
          time. Any single session is capped at {MAX_SESSION_HOURS}h — a host
          who closes the tab isn&apos;t ended until the hourly sweep finds them,
          and that would otherwise inflate the total.
          {totals.excludedShows > 0
            ? ` ${count(totals.excludedShows)} show${totals.excludedShows === 1 ? "" : "s"} from test accounts ${totals.excludedShows === 1 ? "is" : "are"} excluded entirely.`
            : ""}
        </p>
      </section>

      <section className="flex flex-col gap-6 border-t border-border pt-8">
        <h2 className="micro text-muted-foreground">Shows &amp; creators</h2>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Shows" value={count(totals.showsInRange)} />
          <StatTile
            label="Active creators"
            value={count(totals.creatorsInRange)}
            hint={`${count(totals.creatorsAllTime)} have ever gone live`}
          />
          <StatTile
            label="New creators"
            value={count(totals.newCreatorsInRange)}
            hint="First show ever in this range"
          />
          <StatTile
            label="Hours per creator"
            value={hours(
              totals.hoursInRange / Math.max(1, totals.creatorsInRange),
            )}
            hint="Average over active creators"
          />
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <figure className="flex flex-col gap-3">
            <figcaption className="micro text-muted-foreground">
              Shows started
            </figcaption>
            <LineChart data={showsSeries} formatValue={count} />
          </figure>
          <figure className="flex flex-col gap-3">
            <figcaption className="micro text-muted-foreground">
              New creators
            </figcaption>
            <LineChart
              data={newCreatorsSeries}
              formatValue={count}
              accent="var(--chart-4)"
            />
          </figure>
        </div>
      </section>

      <section className="flex flex-col gap-6 border-t border-border pt-8">
        <div className="flex flex-col gap-1">
          <h2 className="micro text-muted-foreground">Creator leaderboard</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Ranked by hours in the last {rangeLabel}.
          </p>
        </div>
        <LeaderboardTable rows={metrics.creators} />
      </section>

      <section className="flex flex-col gap-6 border-t border-border pt-8">
        <h2 className="micro text-muted-foreground">Engagement</h2>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Peak viewers"
            value={count(engagement.peakViewers)}
            hint={`${count(engagement.avgPeakViewers)} avg per show`}
          />
          <StatTile
            label="Chat messages"
            value={count(engagement.chatMessages)}
            hint={`${count(engagement.avgChatMessages)} avg per show`}
          />
          <StatTile
            label="Products pinned"
            value={count(engagement.productsPinned)}
            hint={`${engagement.avgProductsPerShow} avg per show`}
          />
          <StatTile
            label="Product votes"
            value={count(engagement.buyVotes + engagement.skipVotes)}
            hint={
              engagement.buyShare !== null
                ? `${Math.round(engagement.buyShare * 100)}% buy`
                : "No votes yet"
            }
          />
        </div>

        <div className="flex flex-col gap-3 rounded-none bg-card p-4 ring-1 ring-foreground/10">
          <span className="micro text-muted-foreground">Buy vs. skip</span>
          <SplitMeter
            left={{ label: "Buy", value: engagement.buyVotes }}
            right={{ label: "Skip", value: engagement.skipVotes }}
          />
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">
          Viewer and chat counts come from the snapshot each show freezes when
          it ends, so they cover {count(engagement.showsWithStats)} of{" "}
          {count(totals.showsInRange)} shows in this range — older shows and
          shows still live have no frozen stats.
        </p>
      </section>

      <section className="flex flex-col gap-6 border-t border-border pt-8">
        <h2 className="micro text-muted-foreground">Funnel</h2>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Waitlist signups"
            value={count(funnel.signupsInRange)}
            hint={`${count(funnel.signupsAllTime)} all time`}
          />
          <StatTile
            label="Signed up with an account"
            value={count(funnel.signupsWithAccount)}
            hint="Can be granted hosting directly"
          />
          <StatTile
            label="Went live"
            value={count(funnel.signupsConverted)}
            hint={
              funnel.conversionPct !== null
                ? `${funnel.conversionPct}% of all signups`
                : undefined
            }
          />
          <StatTile
            label="Outreach prospects"
            value={count(funnel.prospectTotal)}
            hint={`${count(funnel.prospects.onboarded)} onboarded`}
          />
        </div>

        <figure className="flex flex-col gap-3">
          <figcaption className="micro text-muted-foreground">
            Waitlist signups
          </figcaption>
          <LineChart
            data={signupSeries}
            formatValue={count}
            accent="var(--pop)"
          />
        </figure>

        <div className="flex flex-col gap-3">
          <span className="micro text-muted-foreground">Outreach pipeline</span>
          <div className="flex flex-wrap gap-2">
            {OUTREACH_STATUSES.map((status) => (
              <span
                key={status}
                className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground tabular-nums"
              >
                {OUTREACH_STATUS_LABELS[status]} {funnel.prospects[status]}
              </span>
            ))}
            <button
              type="button"
              className={cn(
                "rounded-full px-3 py-1 text-xs underline-offset-4 hover:underline",
              )}
              onClick={onOpenOutreach}
            >
              Open outreach →
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
