"use client";

import { Check } from "lucide-react";

import { AudienceVerseVotes } from "@/components/audience-verse-votes";
import { HostInteractionLauncher } from "@/components/host-interaction-launcher";
import { Button } from "@/components/ui/button";
import { formatPrice, normalizeProductImageUrl } from "@/lib/format";
import {
  selectPollLeader,
  selectPollShares,
  selectPollTotal,
  type PollInput,
} from "@/lib/poll-store";
import type { Poll, Product } from "@/lib/types";
import { cn } from "@/lib/utils";

export type HostPollControls = {
  poll: Poll | null;
  start: (input: PollInput) => void;
  dismiss: () => void;
  newVote: () => void;
};

export function StudioControls({
  verse,
  verseVotes,
  poll,
  onEndInteraction,
  className,
  variant = "panel",
}: {
  verse: { left: Product; right: Product; id: string } | null;
  verseVotes?: { left: number; right: number };
  poll?: HostPollControls;
  onEndInteraction: () => void;
  className?: string;
  variant?: "panel" | "rail" | "pip";
}) {
  const leftImageUrl = verse
    ? normalizeProductImageUrl(verse.left.imageUrl)
    : null;
  const rightImageUrl = verse
    ? normalizeProductImageUrl(verse.right.imageUrl)
    : null;

  const isRail = variant === "rail" || variant === "pip";
  const isPip = variant === "pip";

  return (
    <div
      className={cn(
        "flex flex-col",
        isRail ? (isPip ? "gap-0 p-0 text-sm" : "gap-0 p-0") : "gap-3 rounded-none bg-card py-4 ring-1 ring-foreground/10",
        className,
      )}
    >
      {poll?.poll ? (
        <ActivePoll poll={poll.poll} onDismiss={poll.dismiss} onNewVote={poll.newVote} isRail={isRail} />
      ) : null}

      {verse ? (
        <ActiveVerse
          verse={verse}
          leftImageUrl={leftImageUrl}
          rightImageUrl={rightImageUrl}
          verseVotes={verseVotes}
          onEnd={onEndInteraction}
          isRail={isRail}
        />
      ) : null}

      {!verse && !poll?.poll && poll?.start && isRail ? (
        <HostInteractionLauncher
          onLaunch={poll.start}
          variant={isPip ? "pip" : "rail"}
        />
      ) : null}
    </div>
  );
}

function ActivePoll({
  poll,
  onDismiss,
  onNewVote,
  isRail,
}: {
  poll: Poll;
  onDismiss: () => void;
  onNewVote: () => void;
  isRail: boolean;
}) {
  const open = poll.status === "open";
  const total = selectPollTotal(poll);
  const shares = selectPollShares(poll);
  const leader = poll.status === "closed" ? selectPollLeader(poll) : null;

  return (
    <div
      className={cn(
        "border-b border-border/60 bg-live/5",
        isRail ? "p-4" : "px-4 pb-4",
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="micro text-live">
            {open ? "Vote live" : "Vote closed"}
          </span>
          <p className="mt-0.5 text-sm font-medium">{poll.question}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-7 px-2 text-xs text-muted-foreground"
          >
            Dismiss
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onNewVote}
            className="h-7 px-2 text-xs"
          >
            New vote
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {poll.options.map((option) => (
          <div
            key={option.id}
            className={cn(
              "flex items-center gap-2 rounded-none bg-muted/50 px-2.5 py-2",
              leader === option.id && "ring-1 ring-live/40",
            )}
          >
            <span className="text-base leading-none">{option.emoji}</span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {option.label}
            </span>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {shares[option.id]}%
            </span>
          </div>
        ))}
      </div>

      <p className="micro mt-2 text-muted-foreground">
        {open
          ? `${total} ${total === 1 ? "vote" : "votes"} so far`
          : `Final · ${total} ${total === 1 ? "vote" : "votes"}`}
      </p>
    </div>
  );
}

function ActiveVerse({
  verse,
  leftImageUrl,
  rightImageUrl,
  verseVotes,
  onEnd,
  isRail,
}: {
  verse: { left: Product; right: Product; id: string };
  leftImageUrl: string | null;
  rightImageUrl: string | null;
  verseVotes?: { left: number; right: number };
  onEnd: () => void;
  isRail: boolean;
}) {
  return (
    <div
      className={cn(
        "border-b border-border/60 bg-live/5",
        isRail ? "p-4" : "px-4 pb-4",
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="micro text-live">Verse on screen</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onEnd}
          className="h-7 gap-1 px-2 text-xs text-muted-foreground"
        >
          <Check className="size-3.5" />
          Done
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          { product: verse.left, imageUrl: leftImageUrl, label: "A" },
          { product: verse.right, imageUrl: rightImageUrl, label: "B" },
        ].map(({ product, imageUrl, label }) => (
          <div key={product.id} className="min-w-0 rounded-none bg-muted/50 p-2">
            {imageUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={imageUrl}
                alt={product.name}
                loading="lazy"
                decoding="async"
                className="aspect-square w-full rounded-none bg-muted object-cover"
              />
            )}
            <p className="micro mt-1.5 text-muted-foreground">{label}</p>
            <p className="truncate text-xs font-medium">{product.name}</p>
            <p className="text-xs tabular-nums text-muted-foreground">
              {formatPrice(product.price, product.currency)}
            </p>
          </div>
        ))}
      </div>

      {verseVotes && (
        <AudienceVerseVotes votes={verseVotes} className="mt-3" />
      )}
    </div>
  );
}
