"use client";

import Link from "next/link";
import { ChevronRight, Radio } from "lucide-react";

import { ShowCard } from "@/components/show-card";
import { Button } from "@/components/ui/button";
import type { DiscoveryShow } from "@/lib/shows";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";
import { hostShowPath } from "@/lib/show-urls";
import { cn } from "@/lib/utils";

/** One of the signed-in user's own shows, serialized for the client. */
export type HostShow = {
  id: string;
  slug: string;
  title: string;
  status: "scheduled" | "live" | "ended";
  startedAt: string | null;
};

/**
 * Signed-in app home — content-first watch feed. Public visitors land on
 * `/` (challenges only); live/upcoming/past shows live here behind auth.
 */
export function BrowsePage({
  liveShows,
  upcomingShows = [],
  pastShows = [],
  isAdmin = false,
  hostShows = [],
}: {
  liveShows: DiscoveryShow[];
  upcomingShows?: DiscoveryShow[];
  pastShows?: DiscoveryShow[];
  isAdmin?: boolean;
  hostShows?: HostShow[];
}) {
  const yourLiveShow = hostShows.find((show) => show.status === "live");

  return (
    <main className="flex w-full flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:gap-8 lg:py-8">
      <HomeToolbar liveCount={liveShows.length} />

      {yourLiveShow ? <HostLiveBanner show={yourLiveShow} /> : null}

      {liveShows.length > 0 ? (
        <ShowRow
          id="live"
          title="Live now"
          eyebrow={
            <span className="inline-flex items-center gap-1.5 text-live">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live" />
              <span className="micro">{liveShows.length} on air</span>
            </span>
          }
        >
          {liveShows.map((show) => (
            <ShowCard
              key={show.slug}
              show={show}
              isAdmin={isAdmin}
              area="home"
              layout="row"
            />
          ))}
        </ShowRow>
      ) : null}

      <ShowRow id="upcoming" title="Upcoming">
        {upcomingShows.length > 0 ? (
          upcomingShows.map((show) => (
            <ShowCard
              key={show.slug}
              show={show}
              variant="upcoming"
              area="home"
              layout="row"
            />
          ))
        ) : (
          <EmptyState message="No shows scheduled yet.">
            <GoLiveButton size="sm" />
          </EmptyState>
        )}
      </ShowRow>

      <ShowGrid id="past" title="Past shows">
        {pastShows.length > 0 ? (
          pastShows.map((show) => (
            <ShowCard
              key={show.slug}
              show={show}
              variant="past"
              area="home"
              layout="grid"
            />
          ))
        ) : (
          <EmptyState message="No finished shows yet." className="col-span-full">
            <GoLiveButton size="sm" />
          </EmptyState>
        )}
      </ShowGrid>
    </main>
  );
}

function HomeToolbar({ liveCount }: { liveCount: number }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <h1 className="text-xl font-medium tracking-tight sm:text-2xl">Home</h1>
        {liveCount > 0 ? (
          <span className="micro inline-flex items-center gap-1.5 text-live">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live" />
            {liveCount} live
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <GoLiveButton />
        <Button variant="ghost" render={<Link href="/saved">Saved</Link>} />
      </div>
    </header>
  );
}

function GoLiveButton({ size = "default" }: { size?: "default" | "sm" }) {
  return (
    <Button
      size={size}
      render={<Link href="/host/setup" />}
      onClick={() =>
        trackEvent(AnalyticsEvent.CTA_GO_LIVE, { area: "home" })
      }
    >
      Go live
    </Button>
  );
}

function HostLiveBanner({ show }: { show: HostShow }) {
  return (
    <section className="flex flex-wrap items-center justify-between gap-3 bg-live/10 px-4 py-3 ring-1 ring-live/30">
      <div className="flex min-w-0 items-center gap-2.5">
        <Radio className="size-4 shrink-0 text-live" />
        <span className="truncate text-sm">
          You&rsquo;re live — <span className="font-medium">{show.title}</span>
        </span>
      </div>
      <Button
        size="sm"
        variant="secondary"
        className="shrink-0 bg-live text-live-foreground hover:bg-live/90"
        render={<Link href={hostShowPath(show.slug)} />}
        onClick={() =>
          trackEvent(AnalyticsEvent.HOST_OPEN_STUDIO, { area: "home" })
        }
      >
        Open studio
        <ChevronRight className="size-4" />
      </Button>
    </section>
  );
}

function FeedSection({
  id,
  title,
  eyebrow,
  children,
}: {
  id?: string;
  title: string;
  eyebrow?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="flex flex-col gap-3 scroll-mt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-lg font-medium tracking-tight sm:text-xl">
          {title}
        </h2>
        {eyebrow}
      </div>
      {children}
    </section>
  );
}

function ShowRow({
  id,
  title,
  eyebrow,
  children,
}: {
  id?: string;
  title: string;
  eyebrow?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <FeedSection id={id} title={title} eyebrow={eyebrow}>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 snap-x snap-mandatory sm:-mx-6 sm:gap-4 sm:px-6">
        {children}
      </div>
    </FeedSection>
  );
}

function ShowGrid({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <FeedSection id={id} title={title}>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {children}
      </div>
    </FeedSection>
  );
}

function EmptyState({
  message,
  children,
  className,
}: {
  message: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-[280px] flex-col gap-3 soft-panel p-6",
        className,
      )}
    >
      <p className="text-sm leading-relaxed text-muted-foreground">{message}</p>
      {children}
    </div>
  );
}
