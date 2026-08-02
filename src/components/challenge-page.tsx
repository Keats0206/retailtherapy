"use client";

import Link from "next/link";
import { Show, SignUpButton } from "@clerk/nextjs";
import { ArrowLeft, Clock, ExternalLink, Wallet } from "lucide-react";

import { ShowCard } from "@/components/show-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ChallengeDetail } from "@/lib/challenges";
import {
  formatBudget,
  formatDuration,
  formatSchedule,
} from "@/lib/challenge-format";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";

/**
 * A sponsored event, in full: the brief, the attempts on air right now, and
 * the recaps of everyone who already ran it.
 *
 * The only action is Take it, which hands off to host setup carrying the slug
 * — that is what attaches the resulting show back to this page.
 */
export function ChallengePage({ challenge }: { challenge: ChallengeDetail }) {
  const duration = formatDuration(challenge.durationSeconds);
  const budget = formatBudget(challenge.budget, challenge.currency);
  const schedule = formatSchedule(challenge);
  const isClosed = challenge.state === "closed";

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-6 sm:px-6 lg:py-10">
      <Link
        href="/browse"
        className="micro inline-flex w-fit items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        All challenges
      </Link>

      <section className="flex flex-col overflow-hidden rounded-3xl bg-card ring-1 ring-foreground/8">
        {challenge.brandLogoUrl ? (
          /* The brand's artwork, set as a banner — on the detail page there is
             room to let the shoot carry the pitch before the brief does. */
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={challenge.brandLogoUrl}
            alt=""
            className="aspect-[21/9] w-full object-cover sm:aspect-[3/1]"
          />
        ) : null}

        <div className="flex flex-col gap-5 p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <span
              className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-muted text-2xl"
              aria-hidden
            >
              {challenge.emoji ?? "🛍️"}
            </span>
            {challenge.liveCount > 0 ? (
              <span className="micro inline-flex items-center gap-1.5 text-live">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live" />
                {challenge.liveCount} live now
              </span>
            ) : schedule ? (
              <Badge variant={isClosed ? "secondary" : "default"} size="micro">
                {schedule}
              </Badge>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <span className="micro text-muted-foreground">
              Sponsored by {challenge.brandName}
            </span>
            <h1 className="text-2xl font-medium leading-tight tracking-tight sm:text-3xl">
              {challenge.title}
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
              {challenge.prompt}
            </p>
          </div>

          <dl className="flex flex-wrap gap-x-8 gap-y-3 border-t border-border pt-5">
            {duration ? (
              <div className="flex flex-col gap-0.5">
                <dt className="micro text-muted-foreground">
                  <Clock className="mr-1 inline size-3" />
                  On the clock
                </dt>
                <dd className="text-base font-medium">{duration}</dd>
              </div>
            ) : null}
            <div className="flex flex-col gap-0.5">
              <dt className="micro text-muted-foreground">
                <Wallet className="mr-1 inline size-3" />
                Budget
              </dt>
              <dd className="text-base font-medium">{budget}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="micro text-muted-foreground">Attempts</dt>
              <dd className="text-base font-medium tabular-nums">
                {challenge.showCount}
              </dd>
            </div>
          </dl>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {!isClosed ? (
              <>
                <Show when="signed-out">
                  <SignUpButton mode="modal">
                    <Button className="w-full sm:w-fit">
                      Take the challenge
                    </Button>
                  </SignUpButton>
                </Show>
                <Show when="signed-in">
                  <Button
                    className="w-full sm:w-fit"
                    render={
                      <Link href={`/host/setup?challenge=${challenge.slug}`} />
                    }
                    onClick={() =>
                      trackEvent(AnalyticsEvent.CHALLENGE_ACCEPT, {
                        area: "challenge",
                        challenge: challenge.slug,
                      })
                    }
                  >
                    Take the challenge
                  </Button>
                </Show>
              </>
            ) : null}
            {challenge.storeUrl ? (
              <Button
                variant="ghost"
                className="w-full sm:w-fit"
                render={
                  <a
                    href={challenge.storeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
                onClick={() =>
                  trackEvent(AnalyticsEvent.CHALLENGE_STORE_CLICK, {
                    area: "challenge",
                    challenge: challenge.slug,
                  })
                }
              >
                Visit {challenge.brandName}
                <ExternalLink className="size-3.5" />
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      {challenge.liveShows.length > 0 ? (
        <section className="flex flex-col gap-4">
          <h2 className="micro text-muted-foreground">Running it now</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {challenge.liveShows.map((show) => (
              <ShowCard key={show.slug} show={show} area="challenge" />
            ))}
          </div>
        </section>
      ) : null}

      {challenge.pastShows.length > 0 ? (
        <section className="flex flex-col gap-4">
          <h2 className="micro text-muted-foreground">Previous attempts</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {challenge.pastShows.map((show) => (
              <ShowCard
                key={show.slug}
                show={show}
                variant="past"
                area="challenge"
              />
            ))}
          </div>
        </section>
      ) : null}

      {challenge.showCount === 0 ? (
        <p className="soft-panel p-6 text-sm leading-relaxed text-muted-foreground">
          No one has taken this on yet. Be the first — the room is watching.
        </p>
      ) : null}
    </main>
  );
}
