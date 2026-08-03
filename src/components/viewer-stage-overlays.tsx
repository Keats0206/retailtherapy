"use client";

import { useMemo } from "react";

import { PinnedProductOverlay } from "@/components/pinned-product-overlay";
import { PollOverlay } from "@/components/poll-overlay";
import type { PollState } from "@/lib/poll-store";
import type { StreamState } from "@/lib/stream-store";

/**
 * Overlays riding the bottom of the video: live polls for everyone, pinned
 * product card for viewers (with vote) and the host (with dismiss).
 */
export function ViewerStageOverlays({
  stream,
  poll,
  role,
  size = "default",
}: {
  stream: StreamState;
  poll: PollState & { newVote?: () => void };
  role: "viewer" | "creator";
  size?: "default" | "compact";
}) {
  const { pinned, verse, votesFor, myVotes, vote, unpin } = stream;
  const pinnedVotes = useMemo(
    () => (pinned ? votesFor(pinned.id) : { buy: 0, skip: 0 }),
    [pinned, votesFor],
  );

  const showPin = pinned && !verse;
  const showPoll = Boolean(poll.poll);

  if (!showPin && !showPoll) return null;

  return (
    <div
      className={
        size === "compact"
          ? "pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col gap-1.5 p-1.5"
          : "pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2 p-3"
      }
    >
      {showPin ? (
        <PinnedProductOverlay
          product={pinned}
          votes={pinnedVotes}
          myVote={myVotes[pinned.id]}
          onVote={role === "viewer" ? (choice) => vote(pinned.id, choice) : undefined}
          onDismiss={role === "creator" ? unpin : undefined}
          role={role}
          size={size}
          embedded
        />
      ) : null}

      {showPoll && poll.poll ? (
        <PollOverlay
          poll={poll.poll}
          myVote={poll.myVote}
          role={role}
          size={size}
          onVote={poll.vote}
          onDismiss={poll.dismiss}
          onNewVote={poll.newVote ?? poll.dismiss}
          embedded
        />
      ) : null}
    </div>
  );
}
