"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, MessageSquare, ShoppingCart } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { ViewerStageOverlays } from "@/components/viewer-stage-overlays";
import { ReactionOverlay } from "@/components/reaction-bar";
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

type WatchTab = "chat" | "cart";

const WATCH_TABS: {
  id: WatchTab;
  label: string;
  icon: typeof MessageSquare;
}[] = [
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "cart", label: "Cart", icon: ShoppingCart },
];

/** Tabbed right rail — chat and shopping trail, matching the host studio pattern. */
export function WatchRail({
  stream,
  chat,
  className,
}: {
  stream: StreamState;
  chat: React.ReactNode;
  className?: string;
}) {
  const { pinned, trail, votesFor, votersFor, myVotes, vote } = stream;
  const [tab, setTab] = useState<WatchTab>("chat");

  return (
    <aside
      className={cn(
        "studio-rail flex min-h-0 w-full shrink-0 flex-col border-border max-lg:h-72 max-lg:shrink-0 max-lg:border-t lg:h-full lg:w-80 lg:border-l xl:w-96",
        className,
      )}
    >
      <nav
        className="pip-studio-tabs flex shrink-0 border-b border-border/60"
        aria-label="Watch panels"
      >
        {WATCH_TABS.map(({ id, label, icon: Icon }) => {
          const count = id === "cart" ? trail.length : 0;
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex flex-1 items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors",
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground/80",
              )}
            >
              <Icon className="size-3.5 shrink-0" />
              <span>{label}</span>
              {count > 0 ? (
                <span
                  className={cn(
                    "min-w-5 rounded-full px-1.5 py-0.5 text-center text-xs font-semibold tabular-nums leading-none",
                    active
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {count}
                </span>
              ) : null}
              {active ? (
                <motion.span
                  layoutId="watch-tab-indicator"
                  className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-live"
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                />
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            {tab === "chat" ? (
              <div className="flex min-h-0 flex-1 flex-col p-3">{chat}</div>
            ) : (
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
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </aside>
  );
}

/**
 * The viewer's shopping experience: video on the left, tabbed chat + trail rail
 * on the right (matching the host studio layout).
 */
const OVERLAY_BUTTON = buttonVariants({ variant: "cinema", size: "icon-sm" });

export function WatchLayout({
  stream,
  stage,
  chat,
  overlay,
  exitHref = "/browse",
}: {
  stream: StreamState;
  stage: React.ReactNode;
  chat: React.ReactNode;
  /** Interactive layer riding the video (live polls); positions itself. */
  overlay?: React.ReactNode;
  /** Where the leave button goes — defaults to the browse page. */
  exitHref?: string;
}) {
  const { verse, myVerseVotes, verseVote } = stream;

  const poll = usePollState({ isHost: false });

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      {/* Main column: video + optional verse banner */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="relative min-h-0 flex-1 bg-black max-lg:aspect-video max-lg:flex-none">
          {stage}

          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start p-2.5">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Link
                    href={exitHref}
                    className={cn(OVERLAY_BUTTON, "pointer-events-auto")}
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

          <ViewerStageOverlays stream={stream} poll={poll} role="viewer" />

          {overlay}
        </div>

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
      </div>

      <WatchRail stream={stream} chat={chat} />
    </div>
  );
}

/** Host stage overlays — reactions from the audience. */
export function HostStageOverlays() {
  const { bursts } = useReactionState({ isHost: true });
  return <ReactionOverlay bursts={bursts} />;
}
