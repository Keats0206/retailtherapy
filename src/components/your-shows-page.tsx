"use client";

import Link from "next/link";
import { ChevronRight, Clapperboard, CalendarClock, Radio } from "lucide-react";

import { DeleteShowButton } from "@/components/delete-show-button";
import { EndLiveShowButton } from "@/components/end-live-show-button";
import { Badge } from "@/components/ui/badge";
import { HostCtaButton } from "@/components/host-cta-button";
import { Card } from "@/components/ui/card";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";
import { hostShowPath, viewerShowPath, waitroomShowPath } from "@/lib/show-urls";
import { cn } from "@/lib/utils";

/** One of the signed-in user's own shows, serialized for the client. */
export type HostShow = {
  id: string;
  slug: string;
  title: string;
  status: "scheduled" | "live" | "ended";
  startedAt: string | null;
  scheduledFor: string | null;
};

/**
 * The host's own shows, split out of the browse feed so `/browse` stays a
 * discovery surface and everything you personally own lives behind one tab.
 */
export function YourShowsPage({
  hostShows = [],
  canHost = false,
}: {
  hostShows?: HostShow[];
  canHost?: boolean;
}) {
  const liveShows = hostShows.filter((show) => show.status === "live");
  const scheduledShows = hostShows.filter((show) => show.status === "scheduled");
  const pastShows = hostShows.filter((show) => show.status === "ended");

  return (
    <main className="flex w-full flex-1 flex-col gap-10 px-4 py-6 sm:px-6 lg:gap-14 lg:py-10">
      <header className="flex flex-col gap-3">
        <h1 className="text-xl font-medium tracking-tight sm:text-2xl">
          Your shows
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
          Everything you&rsquo;ve hosted — open the studio on a live room, manage
          what&rsquo;s scheduled, or revisit a recap.
        </p>
      </header>

      {hostShows.length === 0 ? (
        <section className="soft-panel flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <span className="micro text-muted-foreground">No shows yet</span>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              Go live and add links as you shop. Once you&rsquo;ve hosted, every
              room you run shows up here.
            </p>
          </div>
          <HostCtaButton
            size="sm"
            className="w-fit"
            canHost={canHost}
            area="your-shows"
          />
        </section>
      ) : (
        <div className="flex flex-col gap-10">
          <ShowGroup title="Live now" shows={liveShows} />
          <ShowGroup title="Scheduled" shows={scheduledShows} />
          <ShowGroup title="Past" shows={pastShows} />
        </div>
      )}
    </main>
  );
}

function ShowGroup({ title, shows }: { title: string; shows: HostShow[] }) {
  if (shows.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="micro text-muted-foreground">{title}</h2>
      <div className="flex flex-col gap-2.5">
        {shows.map((show) => (
          <HostShowRow key={show.id} show={show} />
        ))}
      </div>
    </section>
  );
}

function HostShowRow({ show }: { show: HostShow }) {
  const isLive = show.status === "live";
  const isScheduled = show.status === "scheduled";
  const statusLabel = isLive
    ? "Live"
    : isScheduled
      ? "Scheduled"
      : "Ended";
  const actionLabel = isLive
    ? "Open studio"
    : isScheduled
      ? "Manage"
      : "View recap";
  const href = hostShowPath(show.slug);
  const dateLabel = isScheduled && show.scheduledFor
    ? new Date(show.scheduledFor).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : show.startedAt
      ? new Date(show.startedAt).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        })
      : null;
  const pathLabel = isScheduled
    ? waitroomShowPath(show.slug)
    : viewerShowPath(show.slug);

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
                : isScheduled
                  ? AnalyticsEvent.HOST_MANAGE_SCHEDULED
                  : AnalyticsEvent.HOST_VIEW_RECAP,
              { area: "your-shows" },
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
            ) : isScheduled ? (
              <CalendarClock className="size-5" />
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
              {pathLabel}
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
