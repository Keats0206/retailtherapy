"use client";

import Link from "next/link";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { ChevronRight, Clapperboard, Radio } from "lucide-react";

import { DeleteShowButton } from "@/components/delete-show-button";
import { EndLiveShowButton } from "@/components/end-live-show-button";
import { ShowTrailPreview } from "@/components/show-trail-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

export function BrowsePage({
  liveShows,
  pastShows = [],
  isAdmin = false,
  hostShows = [],
  embedded = false,
}: {
  liveShows: DiscoveryShow[];
  pastShows?: DiscoveryShow[];
  isAdmin?: boolean;
  hostShows?: HostShow[];
  /** When true, omits the page chrome — used on /home inside (chrome)/layout. */
  embedded?: boolean;
}) {
  const yourLiveShows = hostShows.filter((show) => show.status === "live");
  const yourPastShows = hostShows.filter((show) => show.status !== "live");

  const main = (
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-12 px-6 py-10 lg:py-14">
        {!embedded ? (
          <section className="flex flex-col gap-3">
            <h1 className="max-w-2xl text-3xl font-normal leading-tight tracking-tight sm:text-4xl lg:text-4xl lg:leading-[1.08]">
              watch people shop.
            </h1>
            <p className="max-w-lg text-base leading-relaxed text-muted-foreground">
              Live shopping shows happening now. Join the room, vote on what
              you&rsquo;d buy, and shop along while hosts show what they&rsquo;re buying.
            </p>
          </section>
        ) : null}

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="micro text-muted-foreground">Live now</h2>
            {liveShows.length > 0 ? (
              <span className="micro inline-flex items-center gap-2 text-live">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live" />
                {liveShows.length} streaming
              </span>
            ) : null}
          </div>

          {liveShows.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {liveShows.map((show) => (
                <ShowCard key={show.slug} show={show} isAdmin={isAdmin} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl bg-muted/40 p-6 text-sm leading-relaxed text-muted-foreground ring-1 ring-foreground/8">
              <Show when="signed-out">
                No one is live right now. Hosts can go live from the browser — sign
                in and hit Go live when you&rsquo;re ready.
              </Show>
              <Show when="signed-in">
                No one is live right now.{" "}
                <Link
                  href="/host/setup"
                  className="text-foreground underline-offset-4 hover:underline"
                  onClick={() =>
                    trackEvent(AnalyticsEvent.CTA_GO_LIVE, { area: "browse" })
                  }
                >
                  Go live
                </Link>{" "}
                from your browser when you&rsquo;re ready.
              </Show>
            </div>
          )}
        </section>

        {pastShows.length > 0 ? (
          <section className="flex flex-col gap-4">
            <h2 className="micro text-muted-foreground">Past shows</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pastShows.map((show) => (
                <ShowCard key={show.slug} show={show} variant="past" />
              ))}
            </div>
          </section>
        ) : null}

        {yourLiveShows.length > 0 ? (
          <section className="flex flex-col gap-4">
            <h2 className="micro text-muted-foreground">Your live shows</h2>
            <div className="flex flex-col gap-2.5">
              {yourLiveShows.map((show) => (
                <HostShowRow key={show.id} show={show} />
              ))}
            </div>
          </section>
        ) : null}

        {yourPastShows.length > 0 ? (
          <section className="flex flex-col gap-4">
            <h2 className="micro text-muted-foreground">Your past shows</h2>
            <div className="flex flex-col gap-2.5">
              {yourPastShows.map((show) => (
                <HostShowRow key={show.id} show={show} />
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-auto flex flex-col gap-4 rounded-xl bg-muted/40 p-6 ring-1 ring-foreground/8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <span className="micro text-muted-foreground">Host a show</span>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              Go live from your browser, add links as you show them, and let
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
                trackEvent(AnalyticsEvent.CTA_GO_LIVE, { area: "browse" })
              }
            >
              Go live
            </Button>
          </Show>
        </section>
      </main>
  );

  if (embedded) {
    return main;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-base font-bold uppercase tracking-widest">
            frontrow
          </Link>
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
                onClick={() =>
                  trackEvent(AnalyticsEvent.CTA_GO_LIVE, { area: "browse" })
                }
              >
                Go live
              </Button>
              <UserButton />
            </Show>
          </div>
        </div>
      </header>

      {main}

      <footer className="mt-auto border-t border-border">
        <div className="mx-auto flex w-full max-w-5xl px-6 py-8">
          <span className="micro text-muted-foreground">frontrow</span>
        </div>
      </footer>
    </div>
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
              { area: "browse" },
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

function ShowCard({
  show,
  isAdmin = false,
  variant = "live",
}: {
  show: DiscoveryShow;
  isAdmin?: boolean;
  variant?: "live" | "past";
}) {
  const isLive = variant === "live";
  const endedDateLabel =
    !isLive && show.endedAt
      ? new Date(show.endedAt).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : null;

  return (
    <Card className="overflow-hidden py-0 ring-foreground/8 transition-colors hover:ring-foreground/15">
      <div className="relative">
        <Link
          href={`/s/${show.slug}`}
          className="flex w-full flex-col text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          onClick={() =>
            trackEvent(
              isLive
                ? AnalyticsEvent.BROWSE_JOIN_SHOW
                : AnalyticsEvent.BROWSE_WATCH_REPLAY,
              { area: "browse" },
            )
          }
        >
          <div className="relative aspect-video w-full overflow-hidden bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={show.thumbnailUrl}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
            {isLive ? (
              <Badge
                variant="destructive"
                size="micro"
                className="absolute left-3 top-3 bg-live text-live-foreground"
              >
                Live
              </Badge>
            ) : endedDateLabel ? (
              <Badge
                variant="secondary"
                size="micro"
                className="absolute left-3 top-3"
              >
                {endedDateLabel}
              </Badge>
            ) : null}
          </div>

          <CardHeader className="pb-2">
            <div className="flex items-start gap-3">
              {show.trailPreview.length > 0 ? (
                <ShowTrailPreview
                  items={show.trailPreview}
                  extraCount={show.trailExtraCount}
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base font-normal">{show.title}</CardTitle>
                <CardDescription>{show.host}</CardDescription>
              </div>
            </div>
          </CardHeader>

          {show.pinnedProduct ? (
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">
                On screen:{" "}
                <span className="text-foreground">{show.pinnedProduct}</span>
              </p>
            </CardContent>
          ) : null}

          <CardFooter className={cn(!show.pinnedProduct && "border-t-0")}>
            <span className="micro text-muted-foreground">
              {isLive ? "Join show" : "Watch replay"}
            </span>
          </CardFooter>
        </Link>
        {isLive && isAdmin ? (
          <div className="absolute right-3 top-3">
            <EndLiveShowButton
              slug={show.slug}
              title={show.title}
              size="micro"
              variant="admin"
            />
          </div>
        ) : null}
      </div>
    </Card>
  );
}
