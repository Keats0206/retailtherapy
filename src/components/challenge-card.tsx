"use client";

import Link from "next/link";
import { ArrowUpRight, Clock, Wallet } from "lucide-react";

import { HostCtaButton } from "@/components/host-cta-button";
import { Button } from "@/components/ui/button";
import type { ChallengeCard as Challenge } from "@/lib/challenges";
import {
  formatBudget,
  formatDuration,
  formatSchedule,
} from "@/lib/challenge-format";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

/**
 * Challenges are built but not open to hosts yet. While this is true the cards
 * keep their layout and stop being doors: no link out of the poster or body,
 * and the action rail collapses to a single inert "Coming soon". Flip to false
 * to hand the tab back to hosts — nothing else needs to change.
 */
const CHALLENGES_COMING_SOON = true;

/**
 * One brand-sponsored launch event on the Challenges tab.
 *
 * Poster on top, facts underneath, actions on a rule at the bottom — the card
 * has to sell a *broadcast*, and a wall of text never did. The poster is the
 * brand's artwork when the event has one, otherwise the emoji over a tinted
 * panel.
 *
 * Everything is square-cornered and hard-edged on purpose, and the body is the
 * only linked region: the buttons are *siblings* of that link rather than
 * children, since a button inside an `<a>` is invalid markup. Card chrome
 * (border, hover, focus ring) therefore lives on the wrapper, not the link.
 */
export function ChallengeEventCard({
  challenge,
  featured = false,
  canHost = false,
}: {
  challenge: Challenge;
  /** The first open event gets the wide treatment on mobile. */
  featured?: boolean;
  canHost?: boolean;
}) {
  const duration = formatDuration(challenge.durationSeconds);
  const budget = formatBudget(challenge.budget, challenge.currency);
  const schedule = formatSchedule(challenge);
  const isOpen = challenge.state === "open";
  const isLive = challenge.liveCount > 0;
  const comingSoon = CHALLENGES_COMING_SOON;

  const body = (
    <>
      <ChallengePoster challenge={challenge} featured={featured} />

      <div className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
        <span className="micro text-muted-foreground">
          {challenge.brandName}
        </span>
        <h3
          className={cn(
            "text-lg font-medium leading-snug tracking-tight text-foreground",
            featured && "sm:text-2xl",
          )}
        >
          {challenge.title}
        </h3>
        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {challenge.prompt}
        </p>

        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-2 text-sm text-muted-foreground">
          {duration ? (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5" />
              {duration}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1.5">
            <Wallet className="size-3.5" />
            {budget}
          </span>
          {challenge.showCount > 0 ? (
            <span>
              {challenge.showCount}{" "}
              {challenge.showCount === 1 ? "attempt" : "attempts"}
            </span>
          ) : null}
        </div>
      </div>
    </>
  );

  return (
    <div
      className={cn(
        "group relative flex flex-col border border-border bg-card transition-colors focus-within:ring-2 focus-within:ring-ring",
        !comingSoon && "hover:border-foreground",
      )}
    >
      {comingSoon ? (
        <div className="flex flex-1 flex-col text-left">{body}</div>
      ) : (
        <Link
          href={`/c/${challenge.slug}`}
          className="flex flex-1 flex-col text-left outline-none"
          onClick={() =>
            trackEvent(AnalyticsEvent.CHALLENGE_OPEN, {
              area: "browse",
              challenge: challenge.slug,
            })
          }
        >
          {body}
        </Link>
      )}

      <div className="flex items-stretch gap-2 border-t border-border p-3 sm:px-5 sm:pb-5">
        {comingSoon ? (
          <Button
            size="sm"
            variant="secondary"
            className="flex-1 rounded-none"
            disabled
          >
            Coming soon
          </Button>
        ) : (
          <>
            {challenge.state !== "closed" ? (
              <HostCtaButton
                size="sm"
                variant={isOpen ? "live" : "secondary"}
                className="flex-1 rounded-none"
                canHost={canHost}
                href={`/host/setup?challenge=${challenge.slug}`}
                area="browse"
                showIcon
                goLiveLabel={isOpen ? "Go live" : "Sign up to host"}
                onClick={() =>
                  trackEvent(AnalyticsEvent.CHALLENGE_ACCEPT, {
                    area: "browse",
                    challenge: challenge.slug,
                  })
                }
              />
            ) : null}
            <Button
              size="sm"
              variant="outline"
              className={cn(
                "rounded-none border",
                challenge.state === "closed" && "flex-1",
              )}
              render={<Link href={`/c/${challenge.slug}`} />}
              onClick={() =>
                trackEvent(AnalyticsEvent.CHALLENGE_OPEN, {
                  area: "browse",
                  challenge: challenge.slug,
                })
              }
            >
              {isLive ? "Watch" : "Details"}
              <ArrowUpRight data-icon="inline-end" />
            </Button>
          </>
        )}
      </div>

      {/* Status rides on the poster, not the body: it is the first thing to
          read on a card that is otherwise all copy. */}
      <span className="pointer-events-none absolute left-0 top-0 flex items-center gap-1.5">
        {comingSoon ? (
          <span className="micro bg-background/90 px-2.5 py-1.5 text-muted-foreground backdrop-blur-sm">
            Coming soon
          </span>
        ) : isLive ? (
          <span className="micro inline-flex items-center gap-1.5 bg-live px-2.5 py-1.5 text-live-foreground">
            <span className="size-1.5 animate-pulse rounded-full bg-live-foreground/80" />
            {challenge.liveCount} live
          </span>
        ) : schedule ? (
          <span
            className={cn(
              "micro px-2.5 py-1.5",
              isOpen
                ? "bg-foreground text-background"
                : "bg-background/90 text-muted-foreground backdrop-blur-sm",
            )}
          >
            {schedule}
          </span>
        ) : null}
      </span>
    </div>
  );
}

/**
 * The event's artwork, cropped to the card. Seeded events ship a still from
 * the brand (`/public/challenges`); anything without one falls back to the
 * emoji at poster scale with the budget set like a headline.
 */
function ChallengePoster({
  challenge,
  featured,
}: {
  challenge: Challenge;
  featured: boolean;
}) {
  const budget = formatBudget(challenge.budget, challenge.currency);
  const duration = formatDuration(challenge.durationSeconds);

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden bg-muted",
        featured ? "aspect-[16/10]" : "aspect-[4/3]",
      )}
    >
      {challenge.brandLogoUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={challenge.brandLogoUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      ) : (
        <>
          <span aria-hidden className="text-6xl sm:text-7xl">
            {challenge.emoji ?? "🛍️"}
          </span>
          {/* The offer, set like a poster headline — the budget and the minimum
              show length are what a host is actually being pitched. */}
          <span className="absolute inset-x-0 bottom-0 flex items-baseline gap-2 p-3 sm:p-4">
            <span className="text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
              {budget}
            </span>
            {duration ? (
              <span className="micro text-muted-foreground">{duration}</span>
            ) : null}
          </span>
        </>
      )}
    </div>
  );
}
