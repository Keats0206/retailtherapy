"use client";

import { X } from "lucide-react";

import { SaveButton } from "@/components/save-button";
import { Button } from "@/components/ui/button";
import { formatPrice, normalizeProductImageUrl } from "@/lib/format";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";
import type { Product, VoteChoice, VoteTally } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The pinned product card that rides the bottom of the video — shop, save,
 * and a buy/skip vote for viewers; the host gets a dismiss control.
 */
export function PinnedProductOverlay({
  product,
  votes,
  myVote,
  onVote,
  onDismiss,
  role,
  size = "default",
  embedded = false,
}: {
  product: Product;
  votes: VoteTally;
  myVote?: VoteChoice;
  onVote?: (choice: VoteChoice) => void;
  onDismiss?: () => void;
  role: "viewer" | "creator";
  size?: "default" | "compact";
  embedded?: boolean;
}) {
  const compact = size === "compact";
  const total = votes.buy + votes.skip;
  const buyPct = total ? Math.round((votes.buy / total) * 100) : 0;
  const imageUrl = normalizeProductImageUrl(product.imageUrl);

  return (
    <div
      className={cn(
        !embedded && "pointer-events-none absolute inset-x-0 bottom-0 z-10",
        !embedded && (compact ? "p-1.5" : "p-3"),
        embedded && "pointer-events-auto w-full",
      )}
    >
      <div
        className={cn(
          "pointer-events-auto cinema-glass-panel flex items-center gap-3 rounded-2xl border",
          "animate-in fade-in-0 slide-in-from-bottom-6 duration-300 ease-out",
          compact ? "p-2" : "p-3",
        )}
      >
        {imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={imageUrl}
            alt={product.name}
            decoding="async"
            className={cn(
              "shrink-0 rounded-xl bg-muted object-cover",
              compact ? "size-12" : "size-16",
            )}
          />
        ) : null}

        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "truncate font-medium text-white",
              compact ? "text-xs" : "text-sm",
            )}
          >
            {product.name}
          </p>
          <p className={cn("text-white/70", compact ? "text-[11px]" : "text-xs")}>
            {formatPrice(product.price, product.currency)}
            {product.retailer ? ` · ${product.retailer}` : ""}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            type="button"
            size={compact ? "micro" : "sm"}
            variant="cinema"
            disabled={!product.buyUrl}
            onClick={() => {
              trackEvent(AnalyticsEvent.PRODUCT_SHOP_CLICK, {
                area: role === "viewer" ? "watch" : "host_studio",
                context: "pinned",
              });
              window.open(product.buyUrl, "_blank", "noopener,noreferrer");
            }}
          >
            Shop
          </Button>
          <SaveButton
            product={product}
            area={role === "viewer" ? "watch" : "host_studio"}
            className={compact ? "h-7" : "h-8"}
          />
          {role === "creator" && onDismiss ? (
            <Button
              type="button"
              size="icon-xs"
              variant="cinema-ghost"
              aria-label="Remove from screen"
              onClick={onDismiss}
            >
              <X className="size-3.5" />
            </Button>
          ) : null}
        </div>

        {role === "viewer" && onVote ? (
          <div className={cn("flex shrink-0", compact ? "gap-1" : "gap-1.5")}>
            <Button
              type="button"
              size={compact ? "micro" : "sm"}
              variant={myVote === "buy" ? "cinema" : "cinema-ghost"}
              disabled={!!myVote}
              onClick={() => {
                trackEvent(AnalyticsEvent.PRODUCT_VOTE, {
                  area: "watch",
                  context: "pinned",
                  choice: "buy",
                });
                onVote("buy");
              }}
            >
              Buy · {votes.buy}
            </Button>
            <Button
              type="button"
              size={compact ? "micro" : "sm"}
              variant={myVote === "skip" ? "cinema" : "cinema-ghost"}
              disabled={!!myVote}
              onClick={() => {
                trackEvent(AnalyticsEvent.PRODUCT_VOTE, {
                  area: "watch",
                  context: "pinned",
                  choice: "skip",
                });
                onVote("skip");
              }}
            >
              Skip · {votes.skip}
            </Button>
          </div>
        ) : role === "creator" ? (
          <p className={cn("shrink-0 text-white/60", compact ? "text-[10px]" : "micro")}>
            {total} {total === 1 ? "vote" : "votes"}
            {total > 0 ? ` · ${buyPct}% buy` : ""}
          </p>
        ) : null}
      </div>
    </div>
  );
}
