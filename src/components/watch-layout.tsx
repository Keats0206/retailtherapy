"use client";

import Link from "next/link";
import { memo, useMemo } from "react";
import { ArrowLeft, ShoppingBag } from "lucide-react";

import { CurrentProduct } from "@/components/current-product";
import { ShoppingTrail } from "@/components/shopping-trail";
import { VerseProduct } from "@/components/verse-product";
import { buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { StreamState } from "@/lib/stream-store";
import { cn } from "@/lib/utils";

/**
 * The viewer's shopping experience, laid out as a theatre: the video takes the
 * whole frame and everything else either overlays it or sits in a narrow rail.
 *
 * The rail is the only scrolling region — the video pane is pinned to the
 * viewport so the stream never scrolls out of view. The shopping trail used to
 * sit under the video and cost a lot of vertical space for something you glance
 * at occasionally, so it lives in a bottom sheet now.
 *
 * Video, viewer count, and chat come in as slots — they're the LiveKit-bound
 * parts. `/watch/[playbackId]` and `/s/[slug]` pass the real ones.
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
    myVotes,
    vote,
    myVerseVotes,
    verseVote,
  } = stream;

  const productRail = useMemo(
    () => (
      <WatchProductRail
        pinned={pinned}
        verse={verse}
        votesFor={votesFor}
        myVotes={myVotes}
        vote={vote}
        myVerseVotes={myVerseVotes}
        verseVote={verseVote}
      />
    ),
    [
      pinned,
      verse,
      votesFor,
      myVotes,
      vote,
      myVerseVotes,
      verseVote,
    ],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <div className="relative min-h-0 min-w-0 flex-1 bg-black max-lg:aspect-video max-lg:flex-none">
        {stage}

        {/* Chrome rides on top of the video rather than taking its own band of
            page. `pointer-events-none` on the bar so it doesn't swallow clicks
            aimed at player controls underneath; the controls opt back in. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2.5">
          <div className="pointer-events-auto flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Link
                    href={exitHref}
                    className={OVERLAY_BUTTON}
                    aria-label="Leave show"
                  >
                    <ArrowLeft className="size-4" />
                  </Link>
                }
              />
              <TooltipContent>Leave show</TooltipContent>
            </Tooltip>

            <Sheet>
              {/* Styled with `buttonVariants` rather than composed via
                  `render={<Button/>}` — SheetTrigger already renders a <button>,
                  so this is one less layer and no prop-merging to reason about. */}
              <SheetTrigger
                className={cn(OVERLAY_BUTTON, "relative")}
                aria-label={`Shopping trail, ${trail.length} ${trail.length === 1 ? "item" : "items"}`}
              >
                <ShoppingBag className="size-4" />
                {trail.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-white text-[10px] font-medium text-black tabular-nums">
                    {trail.length}
                  </span>
                )}
              </SheetTrigger>

            <SheetContent
              side="bottom"
              className="max-h-[70vh] border-t border-border p-0"
            >
              <SheetHeader className="px-4 pt-4 pb-0">
                <SheetTitle className="micro font-normal text-muted-foreground">
                  Shopping trail
                </SheetTitle>
              </SheetHeader>
              <div className="min-h-0 overflow-y-auto px-4 pb-4">
                <ShoppingTrail
                  products={trail}
                  pinnedId={pinned?.id ?? null}
                  className="border-t-0 pt-0"
                />
              </div>
            </SheetContent>
            </Sheet>
          </div>

          <div className="pointer-events-auto text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.5)]">
            {viewers}
          </div>
        </div>

        {overlay}
      </div>

      <aside className="flex min-h-0 w-full flex-col border-border max-lg:flex-1 max-lg:border-t lg:w-90 lg:shrink-0 lg:border-l">
        {productRail}
        <div className="flex min-h-0 flex-1 flex-col p-3 pt-0">{chat}</div>
      </aside>
    </div>
  );
}

const WatchProductRail = memo(function WatchProductRail({
  pinned,
  verse,
  votesFor,
  myVotes,
  vote,
  myVerseVotes,
  verseVote,
}: Pick<
  StreamState,
  | "pinned"
  | "verse"
  | "votesFor"
  | "myVotes"
  | "vote"
  | "myVerseVotes"
  | "verseVote"
>) {
  if (verse) {
    return (
      <VerseProduct
        left={verse.left}
        right={verse.right}
        votes={verse.tallies}
        myVote={myVerseVotes[verse.id]}
        onVote={(choice) => verseVote(verse.id, choice)}
        className="min-h-0 shrink-0 overflow-y-auto"
      />
    );
  }

  return (
    <CurrentProduct
      product={pinned}
      votes={votesFor(pinned?.id ?? "")}
      myVote={pinned ? myVotes[pinned.id] : undefined}
      onVote={(choice) => pinned && vote(pinned.id, choice)}
      className="min-h-0 shrink-0 overflow-y-auto"
    />
  );
});
