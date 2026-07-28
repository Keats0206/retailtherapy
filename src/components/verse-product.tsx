"use client";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatPrice, normalizeProductImageUrl } from "@/lib/format";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";
import type { VerseChoice, VerseTally } from "@/lib/interaction-models";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

function VerseCard({
  product,
  side,
  selected,
  disabled,
  count,
  onSelect,
}: {
  product: Product;
  side: VerseChoice;
  selected: boolean;
  disabled: boolean;
  count: number;
  onSelect: () => void;
}) {
  const imageUrl = normalizeProductImageUrl(product.imageUrl);
  const label = side === "left" ? "Left" : "Right";

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      {imageUrl && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={imageUrl}
          alt={product.name}
          decoding="async"
          className="aspect-square w-full bg-muted object-cover"
        />
      )}
      <div className="mt-2 min-w-0">
        <p className="micro truncate text-muted-foreground">{label}</p>
        <h3 className="micro mt-0.5 truncate">{product.name}</h3>
        <p className="mt-0.5 text-sm tabular-nums">
          {formatPrice(product.price, product.currency)}
        </p>
      </div>
      <Button
        variant={selected ? "default" : "outline"}
        size="micro"
        className="mt-2 w-full"
        disabled={disabled}
        onClick={onSelect}
      >
        {label} · {count}
      </Button>
      {product.buyUrl && (
        <Button
          variant="ghost"
          size="micro"
          className="mt-1 w-full text-muted-foreground"
        onClick={() => {
          trackEvent(AnalyticsEvent.PRODUCT_SHOP_CLICK, {
            area: "watch",
            context: "verse",
            side,
          });
          window.open(product.buyUrl, "_blank", "noopener,noreferrer");
        }}
        >
          Shop
        </Button>
      )}
    </div>
  );
}

/**
 * Side-by-side A/B product vote — the viewer's surface during a verse.
 */
export function VerseProduct({
  left,
  right,
  votes,
  myVote,
  onVote,
  className,
}: {
  left: Product;
  right: Product;
  votes: VerseTally;
  myVote?: VerseChoice;
  onVote: (choice: VerseChoice) => void;
  className?: string;
}) {
  const total = votes.left + votes.right;
  const leftPct = total ? Math.round((votes.left / total) * 100) : 0;

  return (
    <div className={cn("px-3 py-3", className)}>
      <span className="micro text-muted-foreground">Pick one</span>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <VerseCard
          product={left}
          side="left"
          selected={myVote === "left"}
          disabled={!!myVote}
          count={votes.left}
          onSelect={() => {
            trackEvent(AnalyticsEvent.PRODUCT_VOTE, {
              area: "watch",
              context: "verse",
              choice: "left",
            });
            onVote("left");
          }}
        />
        <VerseCard
          product={right}
          side="right"
          selected={myVote === "right"}
          disabled={!!myVote}
          count={votes.right}
          onSelect={() => {
            trackEvent(AnalyticsEvent.PRODUCT_VOTE, {
              area: "watch",
              context: "verse",
              choice: "right",
            });
            onVote("right");
          }}
        />
      </div>

      {total > 0 && (
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="micro text-muted-foreground">Room says</span>
            <span className="micro text-muted-foreground tabular-nums">
              {total} {total === 1 ? "vote" : "votes"}
            </span>
          </div>
          <Progress value={leftPct} className="gap-0" />
          {myVote && (
            <p className="micro mt-2 text-center text-muted-foreground">
              You picked {myVote} · {leftPct}% say left
            </p>
          )}
        </div>
      )}
    </div>
  );
}
