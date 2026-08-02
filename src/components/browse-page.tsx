"use client";

import Link from "next/link";
import { Show, SignInButton, SignUpButton } from "@clerk/nextjs";
import { ChevronRight, Clapperboard, Radio } from "lucide-react";

import { ChallengeEventCard } from "@/components/challenge-card";
import { ChallengeSteps } from "@/components/challenge-steps";
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
 * The home page. There is no landing page in front of this, so it has to work
 * cold for a signed-out visitor and as a dashboard for a signed-in one: the
 * shows and challenges are identical either way, and only the calls to action
 * and the "your shows" section change.
 *
 * Everything is one scroll rather than tabs — challenges and past shows are
 * the point of the page, and hiding either behind a tab meant a visitor who
 * landed on an empty schedule saw nothing at all.
 */
export function BrowsePage({
  challenges = [],
  liveShows,
  pastShows = [],
  isAdmin = false,
  hostShows = [],
}: {
  challenges?: Challenge[];
  liveShows: DiscoveryShow[];
  pastShows?: DiscoveryShow[];
  isAdmin?: boolean;
  hostShows?: HostShow[];
}) {
  const yourLiveShows = hostShows.filter((show) => show.status === "live");
  const yourPastShows = hostShows.filter((show) => show.status !== "live");

  // `listChallenges` already sorts open → upcoming → closed; the split here is
  // only about which heading a card sits under.
  const openChallenges = challenges.filter((entry) => entry.state === "open");
  const upcomingChallenges = challenges.filter(
    (entry) => entry.state === "upcoming",
  );

  return (
    <main className="flex w-full flex-1 flex-col gap-10 px-4 py-6 sm:px-6 lg:gap-14 lg:py-10">
      <PageHeader liveCount={liveShows.length} />

      {liveShows.length > 0 ? (
        <Section
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

      {/* The terms of taking one on, read before the grid of them. */}
      <ChallengeSteps />

      <Section
        title="Challenges"
        description="Brands set the budget and the clock. Hosts go live and try to beat it — you vote on every pick."
      >
        {challenges.length === 0 ? (
          <p className="soft-panel p-6 text-sm leading-relaxed text-muted-foreground">
            No challenges are running right now. Check back soon — new brand
            events drop every week.
          </p>
        ) : (
          <div className="flex flex-col gap-8">
            {openChallenges.length > 0 ? (
              <ChallengeGrid challenges={openChallenges} featureFirst />
            ) : null}

            {upcomingChallenges.length > 0 ? (
              <div className="flex flex-col gap-4">
                <h3 className="micro text-muted-foreground">Coming up</h3>
                <ChallengeGrid
                  challenges={upcomingChallenges}
                  featureFirst={openChallenges.length === 0}
                />
              </div>
            ) : null}
          </div>
        )}
      </Section>

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
 * The masthead. Signed-out visitors get the pitch and a way in; signed-in ones
 * have already had it, so they get the shortcut to going live instead.
 *
 * The mock next to the copy carries the part the words kept failing to: these
 * are *people*, live on camera, shopping a real store. Text alone read as a
 * catalogue.
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
            <Show when="signed-out">
              Hosts go live, add links to what&rsquo;s on screen, and let the
              room vote on what&rsquo;s worth it. No account needed to watch.
            </Show>
            <Show when="signed-in">
              Take a brand challenge, jump into a room, or pick up where a past
              show left off.
            </Show>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Show when="signed-out">
            <SignUpButton mode="modal">
              <Button
                size="sm"
                onClick={() =>
                  trackEvent(AnalyticsEvent.NAV_SIGN_UP, { area: "home" })
                }
              >
                Get started
              </Button>
            </SignUpButton>
            <SignInButton mode="modal">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  trackEvent(AnalyticsEvent.NAV_SIGN_IN, { area: "home" })
                }
              >
                Sign in
              </Button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
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
          </Show>
        </div>
      </div>

      {/* Stacked, the mock reads as an illustration of the pitch, so it follows
          the copy rather than leading it. */}
      <LivePreviewMock />
    </header>
  );
}

function Section({
  title,
  description,
  eyebrow,
  children,
}: {
  title: string;
  description?: string;
  eyebrow?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
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

/**
 * The first card in the schedule is something a host can start right now, so it
 * gets the double-width treatment — but only when it leads the page.
 */
function ChallengeGrid({
  challenges,
  featureFirst = false,
}: {
  challenges: Challenge[];
  featureFirst?: boolean;
}) {
  const [first, ...rest] = challenges;
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
      {featureFirst ? (
        <div className="col-span-2">
          <ChallengeEventCard challenge={first} featured />
        </div>
      ) : (
        <ChallengeEventCard challenge={first} />
      )}
      {rest.map((challenge) => (
        <ChallengeEventCard key={challenge.slug} challenge={challenge} />
      ))}
    </div>
  );
}

function HostCallout() {
  return (
    <section className="mt-auto flex flex-col gap-4 rounded-xl bg-muted/40 p-6 ring-1 ring-foreground/8 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-2">
        <span className="micro text-muted-foreground">Host a show</span>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          Take a challenge or go live on your own. Add links as you shop and let
          the room decide what&rsquo;s worth buying.
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
          onClick={() =>
            trackEvent(AnalyticsEvent.CTA_GO_LIVE, { area: "home" })
          }
        >
          Go live
        </Button>
      </Show>
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
  const href = isLive ? `/host?slug=${show.slug}` : `/host/${show.slug}`;
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
              "flex size-11 shrink-0 items-center justify-center rounded-xl",
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
              /s/{show.slug}
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
