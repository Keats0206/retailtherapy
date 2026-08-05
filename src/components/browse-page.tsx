"use client";

import Link from "next/link";
import { ChevronRight, Clapperboard, Radio } from "lucide-react";

import { ChallengesSection } from "@/components/challenges-section";
import { LivePreviewMock } from "@/components/live-preview-mock";
import { DeleteShowButton } from "@/components/delete-show-button";
import { EndLiveShowButton } from "@/components/end-live-show-button";
import { ShowCard } from "@/components/show-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ChallengeCard as Challenge } from "@/lib/challenges";
import type { DiscoveryShow } from "@/lib/shows";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";
import { hostShowPath, viewerShowPath } from "@/lib/show-urls";
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
 * Signed-in app home — the full discovery feed. Public visitors land on
 * `/` (challenges only); everything else lives here behind auth.
 */
export function BrowsePage({
  challenges = [],
  liveShows,
  upcomingShows = [],
  pastShows = [],
  isAdmin = false,
  hostShows = [],
}: {
  challenges?: Challenge[];
  liveShows: DiscoveryShow[];
  upcomingShows?: DiscoveryShow[];
  pastShows?: DiscoveryShow[];
  isAdmin?: boolean;
  hostShows?: HostShow[];
}) {
  const yourLiveShows = hostShows.filter((show) => show.status === "live");
  const yourPastShows = hostShows.filter((show) => show.status !== "live");

  return (
    <main className="flex w-full flex-1 flex-col gap-10 px-4 py-6 sm:px-6 lg:gap-14 lg:py-10">
      <PageHeader liveCount={liveShows.length} />

      {liveShows.length > 0 ? (
        <Section
          id="live"
          title="Live now"
          eyebrow={
            <span className="inline-flex items-center gap-1.5 text-live">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live" />
              <span className="micro">{liveShows.length} on air</span>
            </span>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {liveShows.map((show) => (
              <ShowCard key={show.slug} show={show} isAdmin={isAdmin} />
            ))}
          </div>
        </Section>
      ) : null}

      <Section
        id="upcoming"
        title="Upcoming shows"
        description="Scheduled shows you can wait for — you'll land in the waitroom until the host goes live."
      >
        {upcomingShows.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingShows.map((show) => (
              <ShowCard
                key={show.slug}
                show={show}
                variant="upcoming"
                area="home"
              />
            ))}
          </div>
        ) : (
          <p className="soft-panel p-6 text-sm leading-relaxed text-muted-foreground">
            No shows scheduled yet. When hosts schedule ahead, they&rsquo;ll
            show up here.
          </p>
        )}
      </Section>

      <ChallengesSection challenges={challenges} />

      {hostShows.length > 0 ? (
        <Section title="Your shows">
          <div className="flex flex-col gap-6">
            {yourLiveShows.length > 0 ? (
              <div className="flex flex-col gap-3">
                <h3 className="micro text-muted-foreground">Live now</h3>
                <div className="flex flex-col gap-2.5">
                  {yourLiveShows.map((show) => (
                    <HostShowRow key={show.id} show={show} />
                  ))}
                </div>
              </div>
            ) : null}

            {yourPastShows.length > 0 ? (
              <div className="flex flex-col gap-3">
                <h3 className="micro text-muted-foreground">Past</h3>
                <div className="flex flex-col gap-2.5">
                  {yourPastShows.map((show) => (
                    <HostShowRow key={show.id} show={show} />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </Section>
      ) : null}

      <Section
        title="Past shows"
        description="Every recap, with the full trail of what the host actually bought."
      >
        {pastShows.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pastShows.map((show) => (
              <ShowCard key={show.slug} show={show} variant="past" />
            ))}
          </div>
        ) : (
          <p className="soft-panel p-6 text-sm leading-relaxed text-muted-foreground">
            No finished shows yet.
          </p>
        )}
      </Section>

      <HostCallout />
    </main>
  );
}

/**
 * App home masthead — signed-in shortcuts only.
 */
function PageHeader({ liveCount }: { liveCount: number }) {
  return (
    <header className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-12">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          {liveCount > 0 ? (
            <span className="micro inline-flex items-center gap-1.5 text-live">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live" />
              {liveCount} {liveCount === 1 ? "show" : "shows"} live right now
            </span>
          ) : null}
          <h1 className="max-w-2xl text-3xl font-normal leading-tight tracking-tight sm:text-4xl lg:leading-[1.08]">
            Watch people shop.
          </h1>
          <p className="max-w-lg text-base leading-relaxed text-muted-foreground">
            Take a brand challenge, jump into a room, or pick up where a past
            show left off.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            render={<Link href="/host/setup" />}
            onClick={() =>
              trackEvent(AnalyticsEvent.CTA_GO_LIVE, { area: "home" })
            }
          >
            Go live
          </Button>
          <Button
            variant="ghost"
            size="sm"
            render={<Link href="/saved">Saved</Link>}
          />
        </div>
      </div>

      <LivePreviewMock />
    </header>
  );
}

function Section({
  id,
  title,
  description,
  eyebrow,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  eyebrow?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="flex flex-col gap-4 scroll-mt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-xl font-medium tracking-tight sm:text-2xl">
          {title}
        </h2>
        {eyebrow}
      </div>
      {description ? (
        <p className="-mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
      {children}
    </section>
  );
}

function HostCallout() {
  return (
    <section className="soft-panel mt-auto flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-2">
        <span className="micro text-muted-foreground">Host a show</span>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          Take a challenge or go live on your own. Add links as you shop and let
          the room decide what&rsquo;s worth buying.
        </p>
      </div>
      <Button
        size="micro"
        className="w-fit"
        render={<Link href="/host/setup" />}
        onClick={() =>
          trackEvent(AnalyticsEvent.CTA_GO_LIVE, { area: "home" })
        }
      >
        Go live
      </Button>
    </section>
  );
}

function HostShowRow({ show }: { show: HostShow }) {
  const isLive = show.status === "live";
  const statusLabel = isLive
    ? "Live"
    : show.status === "ended"
      ? "Ended"
      : "Scheduled";
  const actionLabel = isLive ? "Open studio" : "View recap";
  const href = hostShowPath(show.slug);
  const dateLabel = show.startedAt
    ? new Date(show.startedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <Card className="py-0 ring-foreground/8 transition-all hover:-translate-y-px hover:ring-foreground/20">
      <div className="flex items-center gap-1 pr-2 sm:pr-3">
        <Link
          href={href}
          className="group flex min-w-0 flex-1 items-center gap-3 px-3 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:gap-4 sm:px-4 sm:py-3.5"
          onClick={() =>
            trackEvent(
              isLive
                ? AnalyticsEvent.HOST_OPEN_STUDIO
                : AnalyticsEvent.HOST_VIEW_RECAP,
              { area: "home" },
            )
          }
        >
          <span
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-none",
              isLive
                ? "bg-live/15 text-live-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            {isLive ? (
              <Radio className="size-5" />
            ) : (
              <Clapperboard className="size-5" />
            )}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-base font-normal">
                {show.title}
              </span>
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
              {viewerShowPath(show.slug)}
              {dateLabel ? ` · ${dateLabel}` : null}
            </p>
          </div>
          <span className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground transition-colors group-hover:text-foreground">
            <span className="hidden sm:inline">{actionLabel}</span>
            <ChevronRight className="size-4 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100" />
          </span>
        </Link>
        <DeleteShowButton
          slug={show.slug}
          title={show.title}
          disabled={isLive}
        />
        {isLive ? (
          <EndLiveShowButton slug={show.slug} title={show.title} size="sm" />
        ) : null}
      </div>
    </Card>
  );
}
