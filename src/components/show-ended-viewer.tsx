"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Check, Link2, Play } from "lucide-react";

import { SaveButton } from "@/components/save-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  cleanProductTitle,
  formatCount,
  formatDuration,
  formatPrice,
  normalizeProductImageUrl,
} from "@/lib/format";
import type { EndedShowRecap } from "@/lib/show-recap";
import type { RecordingStatus } from "@/lib/show-public";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";
import { viewerShowPath } from "@/lib/show-urls";
import { sortTrailForReplay, TRAIL_SORTS, type TrailSortId } from "@/lib/trail-sort";
import type { Product, VoteRecord, VoteTally } from "@/lib/types";
import { cn } from "@/lib/utils";

const MuxPlayer = dynamic(() => import("@mux/mux-player-react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-white/50">
      Loading player…
    </div>
  ),
});

/** How the shop rail is ordered. Default mirrors the show itself. */
const SORTS = TRAIL_SORTS;

type SortId = TrailSortId;

/** UTC so the server and client render the same string — no hydration drift. */
const DATE_FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function buyPct(votes: VoteTally): number | null {
  const total = votes.buy + votes.skip;
  return total ? Math.round((votes.buy / total) * 100) : null;
}

/**
 * The replay page: recording on the left, everything the host pinned on the
 * right. This is the page that outlives the stream, so it's built to be
 * browsed — the rail scrolls independently and re-sorts, and every row is a
 * buy link.
 */
export function ShowEndedViewer({
  recap,
  polling = false,
  onRecordingReady,
}: {
  recap: EndedShowRecap;
  /** Poll the show API until muxPlaybackId is available. */
  polling?: boolean;
  onRecordingReady?: () => void | Promise<void>;
}) {
  const sharePath = viewerShowPath(recap.slug);
  const [copied, setCopied] = useState(false);
  const [sort, setSort] = useState<SortId>("order");

  useEffect(() => {
    if (!polling || recap.muxPlaybackId || !onRecordingReady) return;
    const id = setInterval(() => void onRecordingReady(), 10_000);
    return () => clearInterval(id);
  }, [onRecordingReady, polling, recap.muxPlaybackId]);

  async function copyLink() {
    const url = `${window.location.origin}${sharePath}`;
    await navigator.clipboard.writeText(url);
    trackEvent(AnalyticsEvent.REPLAY_SHARE, { area: "replay" });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const trail = recap.snapshot.trail;
  const votesFor = (id: string): VoteTally =>
    recap.snapshot.votes[id] ?? { buy: 0, skip: 0 };
  const votersFor = (id: string): VoteRecord[] =>
    recap.snapshot.voters?.[id] ?? [];

  const sorted = useMemo(() => {
    return sortTrailForReplay(trail, sort, votesFor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trail, sort, recap.snapshot.votes]);

  const topPick = useMemo(() => {
    let best: Product | null = null;
    let bestBuys = 0;
    for (const p of trail) {
      const { buy } = votesFor(p.id);
      if (buy > bestBuys) {
        best = p;
        bestBuys = buy;
      }
    }
    return best;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trail, recap.snapshot.votes]);

  const retailers = new Set(trail.map((p) => p.retailer).filter(Boolean)).size;

  const meta = [
    recap.durationMs ? formatDuration(recap.durationMs) : null,
    recap.peakViewers
      ? `${formatCount(recap.peakViewers)} ${recap.peakViewers === 1 ? "viewer" : "viewers"}`
      : null,
    recap.chatCount
      ? `${formatCount(recap.chatCount)} ${recap.chatCount === 1 ? "message" : "messages"}`
      : null,
    DATE_FMT.format(new Date(recap.endedAt)),
  ].filter(Boolean) as string[];

  const heroImage = normalizeProductImageUrl(recap.thumbnailUrl);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <header className="sticky top-0 z-30 flex shrink-0 items-center justify-between gap-4 border-b border-border/60 bg-background/80 px-4 py-3 backdrop-blur-xl sm:px-6">
        <Link
          href="/"
          className="font-brand text-xl uppercase tracking-[0.12em]"
        >
          frontrow
        </Link>
        <div className="flex items-center gap-2">
          <Button size="micro" variant="ghost" onClick={() => void copyLink()}>
            {copied ? <Check /> : <Link2 />}
            {copied ? "Copied" : "Share"}
          </Button>
          <Button size="micro" variant="outline" render={<Link href="/browse" />}>
            Browse shows
          </Button>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1600px] grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8 lg:py-8 xl:grid-cols-[minmax(0,1fr)_420px]">
        {/* ── Theatre ─────────────────────────────────────────────────── */}
        <section className="flex min-w-0 flex-col gap-5">
          <div className="relative">
            {/* Ambient wash pulled from the first pinned product — the colour
                of the show bleeding out behind the player. */}
            {heroImage && (
              <div
                aria-hidden
                className="pointer-events-none absolute -inset-10 -z-10 overflow-hidden opacity-35 blur-3xl saturate-150 dark:opacity-25"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={heroImage}
                  alt=""
                  className="h-full w-full scale-125 object-cover"
                />
              </div>
            )}

            <div className="relative aspect-video w-full overflow-hidden bg-black ring-1 ring-border">
              {recap.muxPlaybackId ? (
                <MuxPlayer
                  playbackId={recap.muxPlaybackId}
                  className="h-full w-full"
                  streamType="on-demand"
                  preload="auto"
                  accentColor="#ffffff"
                  metadata={{ video_title: recap.title }}
                />
              ) : (
                <RecordingState status={recap.recordingStatus} />
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                size="micro"
                className="gap-1.5 rounded-none border-border text-muted-foreground"
              >
                <span className="size-1.5 rounded-full bg-muted-foreground/60" />
                Replay
              </Badge>
              <span className="micro text-muted-foreground">
                {trail.length} {trail.length === 1 ? "item" : "items"}
                {retailers > 1 ? ` · ${retailers} retailers` : ""}
              </span>
            </div>

            <h1 className="font-heading text-2xl font-medium leading-tight tracking-tight text-balance sm:text-3xl">
              {recap.title}
            </h1>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border pb-5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                {recap.host.trim().charAt(0).toUpperCase() || "?"}
              </span>
              <div className="mr-auto min-w-0">
                <p className="truncate text-sm font-medium">{recap.host}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {meta.join(" · ")}
                </p>
              </div>
              <Button size="micro" variant="secondary" onClick={() => void copyLink()}>
                {copied ? <Check /> : <Link2 />}
                {copied ? "Link copied" : "Copy link"}
              </Button>
            </div>
          </div>

          {topPick && <TopPick product={topPick} votes={votesFor(topPick.id)} />}
        </section>

        {/* ── Shop rail ───────────────────────────────────────────────── */}
        {/* self-start keeps the rail from stretching to the row height, which
            is what lets it actually stick while the theatre column scrolls. */}
        <aside className="flex min-w-0 flex-col lg:sticky lg:top-20 lg:max-h-[calc(100dvh-7rem)] lg:self-start">
          <div className="relative flex flex-col gap-3 bg-card p-3 ring-1 ring-border lg:min-h-0 lg:flex-1 lg:overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-1 pt-1">
              <h2 className="font-heading text-base font-medium">
                Shop the show
              </h2>
              <Badge variant="secondary" className="rounded-none tabular-nums">
                {trail.length}
              </Badge>
            </div>

            {/* Square segmented control: one gray box, hairline dividers
                between the segments, ink fill on the active one. */}
            {trail.length > 1 && (
              <div className="flex divide-x divide-border border border-border">
                {SORTS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSort(s.id)}
                    className={cn(
                      "flex-1 px-2 py-1.5 text-xs font-medium transition-colors",
                      "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                      sort === s.id
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}

            {trail.length === 0 ? (
              <p className="px-1 py-10 text-center text-sm text-muted-foreground">
                No links were added during this show.
              </p>
            ) : (
              <div className="-mr-1 flex flex-col gap-1 overflow-y-auto pr-1 lg:min-h-0 lg:flex-1">
                {sorted.map((p, i) => (
                  <ProductRow
                    key={p.id}
                    product={p}
                    votes={votesFor(p.id)}
                    voters={votersFor(p.id)}
                    index={sort === "order" && !p.featured ? i + 1 : null}
                  />
                ))}
              </div>
            )}

            {/* Only the rail scrolls on desktop — fade its last row so it reads
                as "there's more" rather than a hard crop. */}
            {trail.length > 4 && (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-px bottom-px hidden h-12 bg-gradient-to-t from-card to-transparent lg:block"
              />
            )}
          </div>
        </aside>
      </main>

      <footer className="mx-auto w-full max-w-[1600px] px-4 pb-10 sm:px-6">
        <p className="text-xs text-muted-foreground">
          Links stay shoppable after the show. frontrow may earn a commission on
          purchases.
        </p>
      </footer>
    </div>
  );
}

/** Placeholder while Mux packages the recording, or when none exists. */
function RecordingState({ status }: { status: RecordingStatus }) {
  if (status === "unavailable") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-white/50">
        <span className="flex size-12 items-center justify-center rounded-full bg-white/10">
          <Play className="size-5 translate-x-px" />
        </span>
        <p className="micro">No recording for this show</p>
        <p className="text-xs text-white/35">
          The shopping trail is still here — only the video wasn&apos;t captured.
        </p>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-white/50">
        <span className="flex size-12 items-center justify-center rounded-full bg-white/10">
          <Play className="size-5 translate-x-px" />
        </span>
        <p className="micro">Recording unavailable</p>
        <p className="text-xs text-white/35">
          Packaging took too long or failed. The product trail below is still
          shoppable.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-white/50">
      <span className="flex size-12 items-center justify-center rounded-full bg-white/10">
        <Play className="size-5 translate-x-px" />
      </span>
      <p className="micro">Recording is processing</p>
      <p className="text-xs text-white/35">
        This page will pick it up automatically — usually a few minutes.
      </p>
    </div>
  );
}

/** The item the room most wanted — the one thing worth a big card. */
function TopPick({ product, votes }: { product: Product; votes: VoteTally }) {
  const pct = buyPct(votes);
  const imageUrl = normalizeProductImageUrl(product.imageUrl);
  const name = cleanProductTitle(product.name, product.retailer);

  return (
    // The card is one big buy link, so the save button rides on top of it as a
    // sibling rather than nesting inside — a button inside an <a> is invalid
    // and the anchor would take the click.
    <div className="relative">
      <SaveButton
        product={product}
        area="replay"
        variant="overlay"
        className="absolute right-2 top-2 z-10"
      />
    <a
      href={product.buyUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-4 bg-card p-3 ring-1 ring-border transition-all hover:ring-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:gap-5 sm:p-4"
    >
      {imageUrl && (
        <div className="size-20 shrink-0 overflow-hidden bg-muted sm:size-24">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <span className="micro text-live-foreground/70 dark:text-live">
          Crowd favourite
        </span>
        <p className="mt-1 truncate font-heading text-base font-medium">
          {name}
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {formatPrice(product.price, product.currency)}
          {product.retailer ? ` · ${product.retailer}` : ""}
          {pct !== null ? ` · ${pct}% said buy` : ""}
        </p>
      </div>
      {/* Sits at the bottom of the card rather than centred — it reads as the
          end of the item's story (name → price → buy) instead of floating. */}
      <span className="hidden shrink-0 items-center gap-1.5 self-end bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors group-hover:bg-primary/85 sm:inline-flex">
        Shop
        <ArrowUpRight className="size-4" />
      </span>
      <ArrowUpRight className="size-5 shrink-0 text-muted-foreground sm:hidden" />
    </a>
    </div>
  );
}

/** One row in the shop rail. The whole row is the buy link. */
function ProductRow({
  product,
  votes,
  voters,
  index,
}: {
  product: Product;
  votes: VoteTally;
  voters?: VoteRecord[];
  index: number | null;
}) {
  const imageUrl = normalizeProductImageUrl(product.imageUrl);
  const name = cleanProductTitle(product.name, product.retailer);
  const pct = buyPct(votes);
  const total = votes.buy + votes.skip;
  const soldOut = product.availability === "OutOfStock";

  return (
    // Same shape as TopPick: the row is the buy link, so the save button sits
    // over it rather than inside it.
    <div className="relative">
      <SaveButton
        product={product}
        area="replay"
        variant="overlay"
        className="absolute left-3 bottom-3 z-10"
      />
    <a
      href={product.buyUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex gap-3 p-2 transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <div className="relative size-24 shrink-0 overflow-hidden bg-muted">
        {imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={imageUrl}
            alt={name}
            loading="lazy"
            className={cn(
              "h-full w-full object-cover transition-transform duration-500 group-hover:scale-105",
              soldOut && "opacity-50",
            )}
          />
        ) : (
          <span className="flex h-full items-center justify-center text-xs text-muted-foreground">
            No image
          </span>
        )}
        {index !== null && (
          <span className="cinema-glass absolute left-1 top-1 border px-1.5 py-0.5 text-[0.625rem] font-medium tabular-nums">
            {String(index).padStart(2, "0")}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        <p
          className="line-clamp-2 text-sm font-medium leading-snug decoration-1 underline-offset-2 group-hover:underline"
          title={name}
        >
          {name}
        </p>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium tabular-nums">
            {formatPrice(product.price, product.currency)}
          </span>
          {product.featured && (
            <Badge
              variant="secondary"
              size="micro"
              className="shrink-0 rounded-none"
            >
              Featured
            </Badge>
          )}
          {product.retailer && (
            <span className="truncate text-xs text-muted-foreground">
              {product.retailer}
            </span>
          )}
          {soldOut && (
            <Badge
              variant="outline"
              size="micro"
              className="shrink-0 rounded-none text-muted-foreground"
            >
              Sold out
            </Badge>
          )}
        </div>

        {pct !== null && (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="h-1 w-14 shrink-0 overflow-hidden bg-muted-foreground/20">
                <span
                  className="block h-full bg-live"
                  style={{ width: `${pct}%` }}
                />
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {pct}% said buy · {total} {total === 1 ? "vote" : "votes"}
              </span>
            </div>
            {voters && voters.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {voters.map((v) => v.displayName).join(", ")}
              </span>
            )}
          </div>
        )}

        {product.note && (
          <p className="line-clamp-2 border-l border-border pl-2 text-xs leading-relaxed text-muted-foreground">
            {product.note}
          </p>
        )}
      </div>

      <ArrowUpRight className="absolute right-2 top-2 size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </a>
    </div>
  );
}
