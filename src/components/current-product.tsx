"use client";

import { Badge, Button, Progress } from "@/components/ui";
import { formatPrice } from "@/lib/format";
import type { Product, VoteChoice, VoteTally } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The product the host is currently spotlighting, with the buy link and a
 * Buy/Skip poll. This is the viewer's shopping surface.
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
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700",
          className,
        )}
      >
        <span className="text-sm font-medium">No product on screen yet</span>
        <span className="text-sm text-zinc-500">
          When the host pins something, it shows up here.
        </span>
      </div>
    );
  }

  const total = votes.buy + votes.skip;
  const buyPct = total ? Math.round((votes.buy / total) * 100) : 0;
  const soldOut = product.availability === "OutOfStock";

  return (
    <div
      className={cn(
        "rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 pb-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          On screen now
        </span>
        {soldOut && (
          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            Out of stock
          </Badge>
        )}
      </div>

      <div className="flex gap-4">
        {product.imageUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-24 w-24 shrink-0 rounded-lg object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-semibold leading-tight">{product.name}</h3>
            <span className="shrink-0 text-lg font-semibold">
              {formatPrice(product.price, product.currency)}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
            <span>{product.retailer}</span>
            {product.commissionRate > 0 && (
              <Badge className="font-normal">
                {product.commissionRate}% commission
              </Badge>
            )}
          </div>
          {product.note && (
            <p className="mt-2 border-l-2 border-zinc-200 pl-2 text-sm italic text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
              “{product.note}”
            </p>
          )}
        </div>
      </div>

      <div className="mt-4">
        <Button
          className="w-full"
          disabled={!product.buyUrl}
          onClick={() =>
            window.open(product.buyUrl, "_blank", "noopener,noreferrer")
          }
        >
          Shop at {product.retailer || "retailer"}
        </Button>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs text-zinc-500">
          <span>Should they buy it?</span>
          <span>
            {total} {total === 1 ? "vote" : "votes"}
          </span>
        </div>
        <Progress value={buyPct} />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button
            variant={myVote === "buy" ? "primary" : "outline"}
            size="sm"
            disabled={!!myVote}
            onClick={() => onVote("buy")}
          >
            🔥 Buy · {votes.buy}
          </Button>
          <Button
            variant={myVote === "skip" ? "primary" : "outline"}
            size="sm"
            disabled={!!myVote}
            onClick={() => onVote("skip")}
          >
            👎 Skip · {votes.skip}
          </Button>
        </div>
        {myVote && (
          <p className="mt-1.5 text-center text-xs text-zinc-500">
            You voted {myVote === "buy" ? "Buy" : "Skip"} · {buyPct}% say buy
          </p>
        )}
      </div>
    </div>
  );
}
