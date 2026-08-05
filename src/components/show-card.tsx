"use client";

import Link from "next/link";

import { EndLiveShowButton } from "@/components/end-live-show-button";
import { SaveButton } from "@/components/save-button";
import { HostAvatar, ShowMosaic } from "@/components/show-mosaic";
import { Badge } from "@/components/ui/badge";
import type { DiscoveryShow } from "@/lib/shows";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";
import { viewerShowPath, waitroomShowPath } from "@/lib/show-urls";
import { cn } from "@/lib/utils";

/**
 * A show in a grid — on /browse, and on a challenge's event page.
 *
 * `area` only tags the analytics event, so the two surfaces stay
 * distinguishable in the funnel without duplicating the card.
 */
export function ShowCard({
  show,
  isAdmin = false,
  variant = "live",
  area = "browse",
}: {
  show: DiscoveryShow;
  isAdmin?: boolean;
  variant?: "live" | "past" | "upcoming";
  area?: string;
}) {
  const isLive = variant === "live";
  const isUpcoming = variant === "upcoming";
  const endedDateLabel =
    variant === "past" && show.endedAt
      ? new Date(show.endedAt).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        })
      : null;
  const scheduledDateLabel =
    isUpcoming && show.scheduledFor
      ? new Date(show.scheduledFor).toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : isUpcoming
        ? "Starting soon"
        : null;

  // The board metaphor: what's in it, then when. Live shows lead with the
  // product on screen instead, since that's what a viewer is joining for.
  const itemLabel =
    show.trailTotal > 0
      ? `${show.trailTotal} ${show.trailTotal === 1 ? "item" : "items"}`
      : null;
  const meta = isLive
    ? show.pinnedProduct ?? itemLabel
    : isUpcoming
      ? scheduledDateLabel
      : [itemLabel, endedDateLabel].filter(Boolean).join(" · ");

  const href = isUpcoming
    ? waitroomShowPath(show.slug)
    : viewerShowPath(show.slug);

  return (
    <div className="group relative">
      <Link
        href={href}
        className="flex w-full flex-col gap-3 bg-card p-2 text-left outline-none ring-1 ring-border transition-shadow hover:shadow-lg hover:ring-foreground focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() =>
          trackEvent(
            isLive
              ? AnalyticsEvent.BROWSE_JOIN_SHOW
              : isUpcoming
                ? AnalyticsEvent.BROWSE_JOIN_SHOW
                : AnalyticsEvent.BROWSE_WATCH_REPLAY,
            { area, variant },
          )
        }
      >
        <div className="relative">
          <ShowMosaic
            items={show.trailPreview}
            extraCount={show.trailExtraCount}
            fallbackUrl={show.thumbnailUrl}
          />
          {isLive ? (
            <Badge
              variant="destructive"
              size="micro"
              className="absolute left-3 top-3 gap-1.5 bg-live text-live-foreground"
            >
              <span className="size-1.5 animate-pulse rounded-full bg-live-foreground/80" />
              Live
            </Badge>
          ) : isUpcoming ? (
            <Badge
              variant="secondary"
              size="micro"
              className="absolute left-3 top-3"
            >
              Upcoming
            </Badge>
          ) : null}
        </div>

        <div className="flex items-end justify-between gap-3 px-2 pb-1">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-lg font-medium tracking-tight text-foreground">
              {show.title}
            </h3>
            {meta ? (
              <p className="truncate text-sm text-muted-foreground">{meta}</p>
            ) : null}
          </div>
          <HostAvatar name={show.host} />
        </div>
      </Link>
      {isLive && isAdmin ? (
        <div className="absolute right-5 top-5">
          <EndLiveShowButton
            slug={show.slug}
            title={show.title}
            size="micro"
            variant="admin"
          />
        </div>
      ) : null}
      {/* Sibling of the card link, not a child: a button inside the <a> would
          be invalid markup and clicking it would navigate to the show. Drops
          below the admin control when both are on the same card. */}
      <SaveButton
        showSlug={show.slug}
        area={area}
        variant="overlay"
        className={cn(
          "absolute right-5 z-10",
          isLive && isAdmin ? "top-16" : "top-5",
        )}
      />
    </div>
  );
}
