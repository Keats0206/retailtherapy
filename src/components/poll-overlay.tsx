"use client";

import { useEffect, useState } from "react";
import { Timer, Vote } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  selectPollLeader,
  selectPollShares,
  selectPollTotal,
} from "@/lib/poll-store";
import type { Poll } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The vote layer that rides the bottom of the video: big tap targets while the
 * poll is open, proportional result bars once you've voted or time is up. One
 * component serves both panes — the creator watches live bars from launch and
 * gets Dismiss / New vote; the viewer earns the reveal by voting.
 */
export function PollOverlay({
  poll,
  myVote,
  role,
  size = "default",
  onVote,
  onDismiss,
  onNewVote,
}: {
  poll: Poll;
  myVote: string | null;
  role: "creator" | "viewer";
  /** `compact` fits the studio confidence monitor's narrow column. */
  size?: "default" | "compact";
  onVote?: (optionId: string) => void;
  onDismiss?: () => void;
  onNewVote?: () => void;
}) {
  const compact = size === "compact";
  const open = poll.status === "open";
  const total = selectPollTotal(poll);
  const shares = selectPollShares(poll);
  const leader = poll.status === "closed" ? selectPollLeader(poll) : null;
  const canVote = role === "viewer" && !myVote && open;
  const showResults = role === "creator" || myVote !== null || !open;

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 z-10",
        compact ? "p-1.5" : "p-3",
      )}
    >
      {/* Keyed so a replacement poll replays the entrance. */}
      <div
        key={poll.id}
        className={cn(
          "pointer-events-auto flex flex-col rounded-2xl border border-white/15 bg-black/55 text-white shadow-lg backdrop-blur-md",
          "animate-in fade-in-0 slide-in-from-bottom-6 duration-300 ease-out",
          compact ? "gap-1.5 p-2" : "gap-2 p-3",
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <p
            className={cn(
              "min-w-0 truncate font-medium",
              compact ? "text-xs" : "text-sm",
            )}
          >
            {poll.question}
          </p>
          {role === "creator" && (
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                size="micro"
                variant="ghost"
                className="text-white/70 hover:bg-white/10 hover:text-white"
                onClick={onDismiss}
              >
                Dismiss
              </Button>
              <Button
                type="button"
                size="micro"
                variant="outline"
                className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                onClick={onNewVote}
              >
                New vote
              </Button>
            </div>
          )}
        </div>

        {open && (
          <PollCountdown
            endsAt={poll.endsAt}
            durationMs={poll.durationMs}
            compact={compact}
          />
        )}

        <div className={cn("flex", compact ? "gap-1" : "gap-1.5")}>
          {poll.options.map((option) => (
            <button
              key={option.id}
              type="button"
              disabled={!canVote}
              onClick={() => onVote?.(option.id)}
              // With `basis-0`, grow ratios are width shares — animating grow
              // animates width. The floor keeps a 2% option's emoji visible.
              style={{ flexGrow: showResults ? Math.max(shares[option.id], 6) : 1 }}
              className={cn(
                "flex basis-0 items-center justify-center overflow-hidden rounded-xl border outline-none",
                "transition-[flex-grow,background-color,border-color] duration-700 ease-out",
                compact ? "h-9 min-w-8 gap-1 px-1.5" : "h-13 min-w-12 gap-1.5 px-2",
                canVote
                  ? "cursor-pointer border-white/25 bg-white/10 hover:bg-white/20 focus-visible:border-white active:scale-[0.98]"
                  : "border-white/15 bg-white/10",
                myVote === option.id && "border-live",
                leader === option.id && "border-live bg-live/20",
              )}
            >
              <span className={cn("shrink-0", compact ? "text-sm" : "text-2xl")}>
                {option.emoji}
              </span>
              <span
                className={cn(
                  "truncate font-medium",
                  compact ? "text-[11px]" : "text-sm",
                )}
              >
                {option.label}
              </span>
              {showResults && (
                <span
                  className={cn(
                    "shrink-0 tabular-nums text-white/90 animate-in fade-in-0",
                    compact ? "text-[10px]" : "text-xs",
                  )}
                >
                  {shares[option.id]}%
                </span>
              )}
            </button>
          ))}
        </div>

        <p className={cn("micro text-white/60", compact && "text-[10px]")}>
          {poll.status === "closed"
            ? `Final · ${votesLabel(total)}`
            : myVote
              ? `You voted · ${votesLabel(total)}`
              : role === "creator"
                ? `${votesLabel(total)} so far`
                : "Tap to vote"}
        </p>
      </div>
    </div>
  );
}

function votesLabel(total: number): string {
  return `${total} ${total === 1 ? "vote" : "votes"}`;
}

/**
 * Display-only: shows the seconds and runs the shrinking bar. Never closes the
 * poll — `useMockPollState` owns that timer.
 */
function PollCountdown({
  endsAt,
  durationMs,
  compact,
}: {
  endsAt: number;
  durationMs: number;
  compact?: boolean;
}) {
  const seconds = useCountdownSeconds(endsAt);
  // Captured once: mounted mid-poll (pane toggle), the bar resumes partway
  // through via negative delay instead of restarting from full.
  const [delayMs] = useState(() => endsAt - durationMs - Date.now());

  return (
    <div className="flex items-center gap-1.5">
      <Timer
        className={cn("shrink-0 text-white/70", compact ? "size-3" : "size-3.5")}
      />
      <span
        className={cn(
          "shrink-0 tabular-nums text-white/70",
          compact ? "text-[10px]" : "text-xs",
        )}
      >
        {seconds}s
      </span>
      <div className="h-0.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/20">
        <div
          className="h-full origin-left bg-live"
          style={{
            animation: `poll-countdown ${durationMs}ms linear forwards`,
            animationDelay: `${delayMs}ms`,
          }}
        />
      </div>
    </div>
  );
}

function useCountdownSeconds(endsAt: number): number {
  const [seconds, setSeconds] = useState(() =>
    Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)),
  );

  useEffect(() => {
    const tick = () =>
      setSeconds(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));

    tick();
    const msUntilNextSecond = 1000 - (Date.now() % 1000);
    let interval: ReturnType<typeof setInterval> | undefined;

    const align = setTimeout(() => {
      tick();
      interval = setInterval(tick, 1000);
    }, msUntilNextSecond);

    return () => {
      clearTimeout(align);
      if (interval) clearInterval(interval);
    };
  }, [endsAt]);

  return seconds;
}

/** The on-video pill that opens the composer. Matches WatchLayout's chrome. */
export function PollLaunchButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Start a vote"
      className={cn(
        buttonVariants({ variant: "outline", size: "icon-sm" }),
        "pointer-events-auto rounded-full border-white/30 bg-black/40 text-white backdrop-blur-sm hover:bg-black/60 hover:text-white",
      )}
    >
      <Vote className="size-4" />
    </button>
  );
}
