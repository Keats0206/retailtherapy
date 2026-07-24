"use client";

import { Progress } from "@/components/ui/progress";
import type { VerseTally } from "@/lib/interaction-models";
import { cn } from "@/lib/utils";

/**
 * Read-only left/right tallies for the host studio during a verse.
 */
export function AudienceVerseVotes({
  votes,
  compact,
  className,
}: {
  votes: VerseTally;
  compact?: boolean;
  className?: string;
}) {
  const total = votes.left + votes.right;
  const leftPct = total ? Math.round((votes.left / total) * 100) : 0;

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
        {votes.left} left · {votes.right} right
      </p>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="micro text-muted-foreground">Audience votes</span>
        <span className="micro text-muted-foreground tabular-nums">
          {total} {total === 1 ? "vote" : "votes"} · {leftPct}% left
        </span>
      </div>
      <Progress value={leftPct} className="gap-0" />
      <div className="flex items-center justify-between text-sm tabular-nums">
        <span>Left · {votes.left}</span>
        <span className="text-muted-foreground">Right · {votes.right}</span>
      </div>
    </div>
  );
}
