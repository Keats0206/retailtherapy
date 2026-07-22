"use client";

import { Progress } from "@/components/ui/progress";
import type { VoteTally } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Read-only vote tallies for the host studio. Viewers get the interactive
 * version in `CurrentProduct`; the host just needs to see what the room thinks.
 */
export function AudienceVotes({
  votes,
  compact,
  className,
}: {
  votes: VoteTally;
  /** Fits under a shopping-trail card instead of the pinned-product panel. */
  compact?: boolean;
  className?: string;
}) {
  const total = votes.buy + votes.skip;
  const buyPct = total ? Math.round((votes.buy / total) * 100) : 0;

  if (total === 0) {
    if (compact) return null;
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        No audience votes yet.
      </p>
    );
  }

  if (compact) {
    return (
      <p
        className={cn(
          "mt-1.5 text-xs tabular-nums text-muted-foreground",
          className,
        )}
      >
        {votes.buy} buy · {votes.skip} skip
      </p>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="micro text-muted-foreground">Audience votes</span>
        <span className="micro text-muted-foreground tabular-nums">
          {total} {total === 1 ? "vote" : "votes"} · {buyPct}% buy
        </span>
      </div>
      <Progress value={buyPct} className="gap-0" />
      <div className="flex items-center justify-between text-sm tabular-nums">
        <span>Buy · {votes.buy}</span>
        <span className="text-muted-foreground">Skip · {votes.skip}</span>
      </div>
    </div>
  );
}
