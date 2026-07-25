"use client";

import { Progress } from "@/components/ui/progress";
import type { VoteRecord, VoteTally } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Read-only vote tallies for the host studio. Viewers get the interactive
 * version in the shopping trail feed; the host just needs to see what the room thinks.
 */
export function AudienceVotes({
  votes,
  voters,
  compact,
  className,
}: {
  votes: VoteTally;
  voters?: VoteRecord[];
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

  const buyVoters = voters?.filter((v) => v.choice === "buy") ?? [];
  const skipVoters = voters?.filter((v) => v.choice === "skip") ?? [];

  if (compact) {
    return (
      <div className={cn("mt-1.5", className)}>
        <p className="text-xs tabular-nums text-muted-foreground">
          {votes.buy} buy · {votes.skip} not buy
        </p>
        {voters && voters.length > 0 && (
          <VoterList voters={voters} className="mt-1" />
        )}
      </div>
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
        <span className="text-muted-foreground">Not buy · {votes.skip}</span>
      </div>
      {voters && voters.length > 0 && (
        <div className="flex flex-col gap-1.5 border-t border-border/60 pt-2">
          {buyVoters.length > 0 && (
            <VoterGroup label="Said buy" voters={buyVoters} />
          )}
          {skipVoters.length > 0 && (
            <VoterGroup label="Said not buy" voters={skipVoters} />
          )}
        </div>
      )}
    </div>
  );
}

function VoterGroup({
  label,
  voters,
}: {
  label: string;
  voters: VoteRecord[];
}) {
  return (
    <div>
      <span className="micro text-muted-foreground">{label}</span>
      <VoterList voters={voters} className="mt-0.5" />
    </div>
  );
}

function VoterList({
  voters,
  className,
}: {
  voters: VoteRecord[];
  className?: string;
}) {
  const names = voters.map((v) => v.displayName).join(", ");
  return (
    <p className={cn("text-xs leading-relaxed text-muted-foreground", className)}>
      {names}
    </p>
  );
}
