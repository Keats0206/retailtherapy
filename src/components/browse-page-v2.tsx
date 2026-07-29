"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { ArrowUpRight, Clapperboard, Radio } from "lucide-react";

import type { HostShow } from "@/components/browse-page";
import { DeleteShowButton } from "@/components/delete-show-button";
import { EndLiveShowButton } from "@/components/end-live-show-button";
import { ShowTrailPreview } from "@/components/show-trail-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DiscoveryShow } from "@/lib/shows";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const AREA = "browse-v2";

type Filter = "all" | "live" | "replays";

export function BrowsePageV2({
  liveShows,
  pastShows = [],
  isAdmin = false,
  hostShows = [],
}: {
  liveShows: DiscoveryShow[];
  pastShows?: DiscoveryShow[];
  isAdmin?: boolean;
  hostShows?: HostShow[];
}) {
  const [filter, setFilter] = useState<Filter>("all");

  // The largest-format slot goes to whichever show is live first; replays only
  // get it when nothing is streaming, so the page always leads with motion.
  const heroIsLive = liveShows.length > 0;
  const hero: DiscoveryShow | null = liveShows[0] ?? pastShows[0] ?? null;
  // Whichever list donated the hero gets it removed so it isn't listed twice.
  const gridLive = heroIsLive ? liveShows.slice(1) : liveShows;
  const gridPast = heroIsLive ? pastShows : pastShows.slice(1);

  const visible = useMemo(() => {
    const live = filter === "replays" ? [] : gridLive;
    const past = filter === "live" ? [] : gridPast;
    return { live, past };
  }, [filter, gridLive, gridPast]);

  const yourLiveShows = hostShows.filter((show) => show.status === "live");
  const yourPastShows = hostShows.filter((show) => show.status !== "live");
  const showFilters = gridLive.length > 0 && gridPast.length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3.5">
          <div className="flex items-baseline gap-2">
            <Link href="/" className="text-base font-bold uppercase tracking-widest">
              frontrow
            </Link>
            <Badge variant="secondary" size="micro">
              v2
            </Badge>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Show when="signed-out">
              <SignInButton mode="modal">
                <Button variant="ghost" size="micro">
                  Sign in
                </Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button size="micro">Get started</Button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <Button
                size="micro"
                render={<Link href="/host/setup" />}
                onClick={() => trackEvent(AnalyticsEvent.CTA_GO_LIVE, { area: AREA })}
              >
                Go live
              </Button>
              <UserButton />
            </Show>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-14 px-6 py-10 lg:py-14">
        <section className="flex flex-col gap-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h1 className="max-w-2xl text-4xl font-normal leading-[1.05] tracking-tight sm:text-5xl">
              watch people shop.
            </h1>
            {liveShows.length > 0 ? (
              <span className="micro inline-flex items-center gap-2 rounded-full bg-live/12 px-3 py-1.5 text-live-foreground ring-1 ring-live/30">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live" />
                {liveShows.length} streaming now
              </span>
            ) : null}
          </div>
          <p className="max-w-xl text-base leading-relaxed text-muted-foreground">
            Join the room, vote on what you&rsquo;d buy, and shop along while hosts
            show what they&rsquo;re buying.
          </p>
        </section>

        {hero ? (
          <FeaturedShow show={hero} isLive={heroIsLive} isAdmin={isAdmin} />
        ) : (
          <div className="soft-panel p-8 text-sm leading-relaxed text-muted-foreground">
            <Show when="signed-out">
              No one is live right now. Hosts go live straight from the browser —
              sign in and hit Go live when you&rsquo;re ready.
            </Show>
            <Show when="signed-in">
              No one is live right now.{" "}
              <Link
                href="/host/setup"
                className="text-foreground underline-offset-4 hover:underline"
                onClick={() => trackEvent(AnalyticsEvent.CTA_GO_LIVE, { area: AREA })}
              >
                Go live
              </Link>{" "}
              from your browser when you&rsquo;re ready.
            </Show>
          </div>
        )}

        {gridLive.length > 0 || gridPast.length > 0 ? (
          <section className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="micro text-muted-foreground">
                {showFilters ? "More shows" : gridLive.length > 0 ? "Live now" : "Replays"}
              </h2>
              {showFilters ? (
                <div className="flex items-center gap-1 rounded-full bg-muted/50 p-1 ring-1 ring-foreground/8">
                  {(
                    [
                      ["all", "All"],
                      ["live", "Live"],
                      ["replays", "Replays"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFilter(value)}
                      aria-pressed={filter === value}
                      className={cn(
                        "micro rounded-full px-3 py-1.5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        filter === value
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {visible.live.map((show) => (
                <ShowTile key={show.slug} show={show} isLive isAdmin={isAdmin} />
              ))}
              {visible.past.map((show) => (
                <ShowTile key={show.slug} show={show} isLive={false} />
              ))}
            </div>
          </section>
        ) : null}

        {yourLiveShows.length > 0 ? (
          <HostSection title="Your live shows" shows={yourLiveShows} />
        ) : null}
        {yourPastShows.length > 0 ? (
          <HostSection title="Your past shows" shows={yourPastShows} />
        ) : null}

        <section className="mt-auto flex flex-col gap-4 rounded-2xl bg-muted/40 p-7 ring-1 ring-foreground/8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <span className="micro text-muted-foreground">Host a show</span>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              Go live from your browser, add links as you show them, and let the
              room decide what&rsquo;s worth buying.
            </p>
          </div>
          <Show when="signed-out">
            <SignUpButton mode="modal">
              <Button size="micro" className="w-fit">
                Get started
              </Button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <Button
              size="micro"
              className="w-fit"
              render={<Link href="/host/setup" />}
              onClick={() => trackEvent(AnalyticsEvent.CTA_GO_LIVE, { area: AREA })}
            >
              Go live
            </Button>
          </Show>
        </section>
      </main>

      <footer className="mt-auto border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-8">
          <span className="micro text-muted-foreground">frontrow</span>
          <Link href="/browse" className="micro text-muted-foreground hover:text-foreground">
            Classic browse
          </Link>
        </div>
      </footer>
    </div>
  );
}

function FeaturedShow({
  show,
  isLive,
  isAdmin,
}: {
  show: DiscoveryShow;
  isLive: boolean;
  isAdmin: boolean;
}) {
  return (
    <section className="relative">
      <Link
        href={`/s/${show.slug}`}
        className="group block overflow-hidden rounded-2xl ring-1 ring-foreground/8 outline-none transition-all hover:ring-foreground/20 focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() =>
          trackEvent(
            isLive ? AnalyticsEvent.BROWSE_JOIN_SHOW : AnalyticsEvent.BROWSE_WATCH_REPLAY,
            { area: AREA, featured: true },
          )
        }
      >
        <div className="relative aspect-16/9 w-full overflow-hidden bg-muted sm:aspect-21/9">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={show.thumbnailUrl}
            alt=""
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
          <div className="cinema-scrim-bottom absolute inset-x-0 bottom-0 h-2/3" />

          <div className="absolute left-4 top-4 sm:left-6 sm:top-6">
            {isLive ? (
              <span className="micro inline-flex items-center gap-2 rounded-full bg-live px-2.5 py-1 text-live-foreground">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live-foreground" />
                Live
              </span>
            ) : (
              <Badge variant="secondary" size="micro">
                {formatEndedAt(show.endedAt) ?? "Replay"}
              </Badge>
            )}
          </div>

          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-4 p-4 sm:flex-row sm:items-end sm:justify-between sm:p-6">
            <div className="flex min-w-0 flex-col gap-2">
              <h2 className="text-2xl font-normal leading-tight tracking-tight text-white sm:text-3xl">
                {show.title}
              </h2>
              <p className="text-sm text-white/75">
                {show.host}
                {show.pinnedProduct ? (
                  <>
                    {" · on screen: "}
                    <span className="text-white">{show.pinnedProduct}</span>
                  </>
                ) : null}
              </p>
            </div>
            <span className="micro inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-4 py-2 text-black">
              {isLive ? "Join show" : "Watch replay"}
              <ArrowUpRight className="size-3.5" />
            </span>
          </div>
        </div>
      </Link>
      {isLive && isAdmin ? (
        <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
          <EndLiveShowButton
            slug={show.slug}
            title={show.title}
            size="micro"
            variant="admin"
          />
        </div>
      ) : null}
    </section>
  );
}

function ShowTile({
  show,
  isLive,
  isAdmin = false,
}: {
  show: DiscoveryShow;
  isLive: boolean;
  isAdmin?: boolean;
}) {
  const endedDateLabel = isLive ? null : formatEndedAt(show.endedAt);

  return (
    <div className="relative flex flex-col gap-3">
      <Link
        href={`/s/${show.slug}`}
        className="group flex flex-col gap-3 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
        onClick={() =>
          trackEvent(
            isLive ? AnalyticsEvent.BROWSE_JOIN_SHOW : AnalyticsEvent.BROWSE_WATCH_REPLAY,
            { area: AREA },
          )
        }
      >
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/8 transition-all group-hover:ring-foreground/20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={show.thumbnailUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
          {isLive ? (
            <span className="micro absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full bg-live px-2 py-0.5 text-live-foreground">
              <span className="h-1 w-1 animate-pulse rounded-full bg-live-foreground" />
              Live
            </span>
          ) : endedDateLabel ? (
            <Badge variant="secondary" size="micro" className="absolute left-2.5 top-2.5">
              {endedDateLabel}
            </Badge>
          ) : null}
        </div>

        <div className="flex items-start gap-3">
          {show.trailPreview.length > 0 ? (
            <ShowTrailPreview items={show.trailPreview} extraCount={show.trailExtraCount} />
          ) : null}
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-base font-normal leading-snug">{show.title}</span>
            <span className="truncate text-sm text-muted-foreground">{show.host}</span>
            {show.pinnedProduct ? (
              <span className="truncate text-sm text-muted-foreground">
                On screen:{" "}
                <span className="text-foreground">{show.pinnedProduct}</span>
              </span>
            ) : null}
          </div>
        </div>
      </Link>
      {isLive && isAdmin ? (
        <div className="absolute right-2.5 top-2.5">
          <EndLiveShowButton
            slug={show.slug}
            title={show.title}
            size="micro"
            variant="admin"
          />
        </div>
      ) : null}
    </div>
  );
}

function HostSection({ title, shows }: { title: string; shows: HostShow[] }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="micro text-muted-foreground">{title}</h2>
      <div className="flex flex-col gap-2">
        {shows.map((show) => (
          <HostShowRow key={show.id} show={show} />
        ))}
      </div>
    </section>
  );
}

function HostShowRow({ show }: { show: HostShow }) {
  const isLive = show.status === "live";
  const statusLabel = isLive ? "Live" : show.status === "ended" ? "Ended" : "Scheduled";
  const href = isLive ? `/host?slug=${show.slug}` : `/host/${show.slug}`;
  const dateLabel = show.startedAt
    ? new Date(show.startedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <div className="flex items-center gap-1 rounded-xl pr-2 ring-1 ring-foreground/8 transition-all hover:ring-foreground/20 sm:pr-3">
      <Link
        href={href}
        className="group flex min-w-0 flex-1 items-center gap-3 px-3 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring sm:gap-4 sm:px-4"
        onClick={() =>
          trackEvent(
            isLive ? AnalyticsEvent.HOST_OPEN_STUDIO : AnalyticsEvent.HOST_VIEW_RECAP,
            { area: AREA },
          )
        }
      >
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg",
            isLive ? "bg-live/15 text-live-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          {isLive ? <Radio className="size-4.5" /> : <Clapperboard className="size-4.5" />}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="truncate text-base font-normal">{show.title}</span>
            {isLive ? (
              <span className="inline-flex shrink-0 items-center gap-1.5 text-live">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live" />
                <span className="micro">{statusLabel}</span>
              </span>
            ) : (
              <Badge variant="secondary" size="micro" className="shrink-0">
                {statusLabel}
              </Badge>
            )}
          </div>
          <p className="truncate text-sm text-muted-foreground">
            /s/{show.slug}
            {dateLabel ? ` · ${dateLabel}` : null}
          </p>
        </div>
        <span className="micro hidden shrink-0 text-muted-foreground transition-colors group-hover:text-foreground sm:inline">
          {isLive ? "Open studio" : "View recap"}
        </span>
      </Link>
      <DeleteShowButton slug={show.slug} title={show.title} disabled={isLive} />
      {isLive ? <EndLiveShowButton slug={show.slug} title={show.title} size="sm" /> : null}
    </div>
  );
}

function formatEndedAt(endedAt: DiscoveryShow["endedAt"]): string | null {
  if (!endedAt) return null;
  return new Date(endedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
