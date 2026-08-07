"use client";

import Link from "next/link";

import { EndLiveShowButton } from "@/components/end-live-show-button";
import { SaveButton } from "@/components/save-button";
import {
  HostAvatar,
  ShowCover,
  TrailPreviewStrip,
} from "@/components/show-mosaic";
import { Badge } from "@/components/ui/badge";
import type { DiscoveryShow } from "@/lib/shows";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";
import { viewerShowPath, waitroomShowPath } from "@/lib/show-urls";
import { cn } from "@/lib/utils";

/**
 * A show in a grid — Twitch-style: wide preview on top, host row underneath,
 * then a strip of trail items where tags would sit on a stream card.
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

  const itemLabel =
    show.trailTotal > 0
      ? `${show.trailTotal} ${show.trailTotal === 1 ? "item" : "items"}`
      : null;
  const subtitle = isLive
    ? show.pinnedProduct ?? "Live shopping"
    : isUpcoming
      ? scheduledDateLabel
      : endedDateLabel ?? "Replay";

  const thumbnailCaption = isUpcoming
    ? scheduledDateLabel
    : itemLabel;

  const href = isUpcoming
    ? waitroomShowPath(show.slug)
    : viewerShowPath(show.slug);

  return (
    <div className="group relative">
      <Link
        href={href}
        className="flex w-full flex-col gap-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
        <div className="relative overflow-hidden bg-muted">
          <ShowCover src={show.thumbnailUrl} alt={show.title} />

          {isLive ? (
            <Badge
              variant="destructive"
              size="micro"
              className="absolute left-2 top-2 gap-1.5 bg-live text-live-foreground"
            >
              <span className="size-1.5 animate-pulse rounded-full bg-live-foreground/80" />
              Live
            </Badge>
          ) : isUpcoming ? (
            <Badge
              variant="secondary"
              size="micro"
              className="absolute left-2 top-2 bg-background/90"
            >
              Upcoming
            </Badge>
          ) : (
            <Badge
              variant="secondary"
              size="micro"
              className="absolute left-2 top-2 bg-background/90"
            >
              Replay
            </Badge>
          )}

          {thumbnailCaption ? (
            <span className="absolute bottom-2 left-2 max-w-[calc(100%-1rem)] truncate bg-black/70 px-2 py-0.5 text-xs font-medium text-white">
              {thumbnailCaption}
            </span>
          ) : null}
        </div>

        <div className="flex gap-2.5">
          <HostAvatar name={show.host} className="size-10" />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold leading-snug text-foreground group-hover:underline">
              {show.title}
            </h3>
            <p className="truncate text-sm text-muted-foreground">{show.host}</p>
            {subtitle ? (
              <p className="truncate text-sm text-muted-foreground/80">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>

        <TrailPreviewStrip
          items={show.trailPreview}
          extraCount={show.trailExtraCount}
        />
      </Link>

      {isLive && isAdmin ? (
        <div className="absolute right-2 top-2">
          <EndLiveShowButton
            slug={show.slug}
            title={show.title}
            size="micro"
            variant="admin"
          />
        </div>
      ) : null}

      <SaveButton
        showSlug={show.slug}
        area={area}
        variant="overlay"
        className={cn(
          "absolute right-2 z-10",
          isLive && isAdmin ? "top-12" : "top-2",
        )}
      />
    </div>
  );
}

/** Pick the card variant from discovery fields when the caller doesn't know status. */
export function discoveryShowVariant(
  show: DiscoveryShow,
): "live" | "past" | "upcoming" {
  if (show.scheduledFor) return "upcoming";
  if (show.endedAt) return "past";
  return "live";
}
