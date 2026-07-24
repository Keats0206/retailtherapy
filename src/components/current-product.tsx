"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatPrice, normalizeProductImageUrl } from "@/lib/format";
import type { Product, VoteChoice, VoteTally } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The product the host is currently spotlighting, with the buy link and a
 * Buy/Skip poll. This is the viewer's shopping surface.
 *
 * The image is the hero — it gets the full rail width, and the spacing around
 * everything else is kept tight so the image and the buy action both stay above
 * the fold in a short rail.
 *
 * Product images come from arbitrary retailer CDNs, so this uses a plain <img>
 * rather than next/image — otherwise every new retailer would need a
 * `remotePatterns` entry in next.config.ts before its images would load.
 */
export function CurrentProduct({
  product,
  votes,
  myVote,
  onVote,
  className,
}: {
  product: Product | null;
  votes: VoteTally;
  myVote?: VoteChoice;
  onVote: (choice: VoteChoice) => void;
  className?: string;
}) {
  if (!product) {
    return (
      <div className={cn("px-3 py-3", className)}>
        <span className="micro text-muted-foreground">On screen now</span>
        <p className="py-6 text-sm text-muted-foreground">
          When the host adds a link, it shows up here.
        </p>
      </div>
    );
  }

  const total = votes.buy + votes.skip;
  const buyPct = total ? Math.round((votes.buy / total) * 100) : 0;
  const soldOut = product.availability === "OutOfStock";
  const imageUrl = normalizeProductImageUrl(product.imageUrl);

  return (
    <div className={cn("px-3 py-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="micro text-muted-foreground">On screen now</span>
        {soldOut && (
          <Badge variant="outline" size="micro" className="text-muted-foreground">
            Out of stock
          </Badge>
        )}
      </div>

      {/* The image is the product. Give it the full column width rather than a
          thumbnail beside text. */}
      {imageUrl && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={imageUrl}
          alt={product.name}
          className="mt-2 aspect-square w-full bg-muted object-cover"
        />
      )}

      <div className="mt-2.5 flex items-baseline justify-between gap-3">
        <h3 className="micro min-w-0">{product.name}</h3>
        <span className="shrink-0 text-sm tabular-nums">
          {formatPrice(product.price, product.currency)}
        </span>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <span className="micro text-muted-foreground">{product.retailer}</span>
        {product.commissionRate > 0 && (
          <Badge variant="outline" size="micro" className="text-muted-foreground">
            {product.commissionRate}% commission
          </Badge>
        )}
      </div>

      {product.note && (
        <p className="mt-2.5 border-l border-border pl-2.5 text-sm leading-relaxed text-muted-foreground">
          {product.note}
        </p>
      )}

      <Button
        size="micro"
        className="mt-3 w-full"
        disabled={!product.buyUrl}
        onClick={() =>
          window.open(product.buyUrl, "_blank", "noopener,noreferrer")
        }
      >
        Shop at {product.retailer || "retailer"}
      </Button>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="micro text-muted-foreground">Should they buy it?</span>
          <span className="micro text-muted-foreground tabular-nums">
            {total} {total === 1 ? "vote" : "votes"}
          </span>
        </div>
        <Progress value={buyPct} className="gap-0" />
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <Button
            variant={myVote === "buy" ? "default" : "outline"}
            size="micro"
            disabled={!!myVote}
            onClick={() => onVote("buy")}
          >
            Buy · {votes.buy}
          </Button>
          <Button
            variant={myVote === "skip" ? "default" : "outline"}
            size="micro"
            disabled={!!myVote}
            onClick={() => onVote("skip")}
          >
            Not buy · {votes.skip}
          </Button>
        </div>
        {myVote && (
          <p className="micro mt-2 text-center text-muted-foreground">
            You voted {myVote === "skip" ? "not buy" : myVote} · {buyPct}% say buy
          </p>
        )}
      </div>
    </div>
  );
}
