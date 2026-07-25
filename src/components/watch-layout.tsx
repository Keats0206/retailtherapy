"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowLeft } from "lucide-react";

import { CurrentProduct } from "@/components/current-product";
import { PollOverlay } from "@/components/poll-overlay";
import { ReactionBar, ReactionOverlay } from "@/components/reaction-bar";
import { ShoppingTrail } from "@/components/shopping-trail";
import { VerseProduct } from "@/components/verse-product";
import { buttonVariants } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePollState } from "@/lib/poll-state";
import { useReactionState } from "@/lib/reaction-state";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";
import type { StreamState } from "@/lib/stream-store";
import { cn } from "@/lib/utils";

/**
 * The viewer's shopping experience: video and trail on the left (trail sits
 * below the video like YouTube comments), chat always on the right.
 */
const OVERLAY_BUTTON = cn(
  buttonVariants({ variant: "outline", size: "icon-sm" }),
  "rounded-full border-white/30 bg-black/40 text-white backdrop-blur-sm hover:bg-black/60 hover:text-white",
);

export function WatchLayout({
  stream,
  stage,
  viewers,
  chat,
  overlay,
  exitHref = "/browse",
}: {
  stream: StreamState;
  stage: React.ReactNode;
  viewers: React.ReactNode;
  chat: React.ReactNode;
  /** Interactive layer riding the video (live polls); positions itself. */
  overlay?: React.ReactNode;
  /** Where the leave button goes — defaults to the browse page. */
  exitHref?: string;
}) {
  const {
    pinned,
    verse,
    trail,
    votesFor,
    votersFor,
    myVotes,
    vote,
    myVerseVotes,
    verseVote,
  } = stream;

  const poll = usePollState({ isHost: false });
  const { react } = useReactionState({ isHost: false });

  const pinnedVotes = useMemo(
    () => (pinned ? votesFor(pinned.id) : { buy: 0, skip: 0 }),
    [pinned, votesFor],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      {/* Main column: video + trail below */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="relative min-h-0 flex-1 bg-black max-lg:aspect-video max-lg:flex-none">
          {stage}

          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2.5">
            <div className="pointer-events-auto flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Link
                      href={exitHref}
                      className={OVERLAY_BUTTON}
                      aria-label="Leave show"
                      onClick={() =>
                        trackEvent(AnalyticsEvent.WATCH_LEAVE, { area: "watch" })
                      }
                    >
                      <ArrowLeft className="size-4" />
                    </Link>
                  }
                />
                <TooltipContent>Leave show</TooltipContent>
              </Tooltip>
            </div>

            <div className="pointer-events-auto flex items-center gap-2">
              <ReactionBar
                onReact={(emoji) => {
                  trackEvent(AnalyticsEvent.REACTION_SENT, {
                    area: "watch",
                    emoji,
                  });
                  react(emoji);
                }}
              />
              <div className="text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.5)]">
                {viewers}
              </div>
            </div>
          </div>

          {poll.poll && (
            <PollOverlay
              poll={poll.poll}
              myVote={poll.myVote}
              role="viewer"
              onVote={poll.vote}
            />
          )}

          {overlay}
        </div>

        {/* Pinned product hero — shown when host spotlights an item */}
        {pinned && !verse && (
          <div className="shrink-0 border-t border-border bg-background">
            <CurrentProduct
              product={pinned}
              votes={pinnedVotes}
              myVote={myVotes[pinned.id]}
              onVote={(choice) => vote(pinned.id, choice)}
            />
          </div>
        )}

        {/* Verse voting banner — shown above trail when a verse is active */}
        {verse && (
          <div className="shrink-0 border-t border-border bg-background">
            <VerseProduct
              left={verse.left}
              right={verse.right}
              votes={verse.tallies}
              myVote={myVerseVotes[verse.id]}
              onVote={(choice) => verseVote(verse.id, choice)}
              className="max-h-48 overflow-y-auto"
            />
          </div>
        )}

        {/* Shopping trail — scrollable feed below the video */}
        <div className="flex min-h-0 max-h-80 shrink-0 flex-col border-t border-border bg-background lg:max-h-96">
          <ShoppingTrail
            products={trail}
            pinnedId={pinned?.id ?? null}
            votesFor={votesFor}
            votersFor={votersFor}
            myVotes={myVotes}
            onVote={(productId, choice) => vote(productId, choice)}
            variant="feed"
            sortable
            className="min-h-0 flex-1"
          />
        </div>
      </div>

      {/* Chat rail — always on the right */}
      <aside className="flex min-h-0 w-full flex-col border-border max-lg:h-72 max-lg:shrink-0 max-lg:border-t lg:w-80 lg:shrink-0 lg:border-l xl:w-96">
        <div className="flex min-h-0 flex-1 flex-col p-3">{chat}</div>
      </aside>
    </div>
  );
}

/** Host stage overlays — reactions from the audience. */
export function HostStageOverlays() {
  const { bursts } = useReactionState({ isHost: true });
  return <ReactionOverlay bursts={bursts} />;
}
