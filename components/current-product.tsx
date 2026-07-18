"use client";

import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";
import { castVote, recordClick } from "@/lib/store";
import { toggleWishlist, useWishlist } from "@/lib/wishlist";
import { VerdictBadge } from "@/components/product-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export function CurrentProduct({
  product,
  className,
}: {
  product: Product | null;
  className?: string;
}) {
  const wishlist = useWishlist();
  const [voted, setVoted] = useState<Record<string, "buy" | "skip">>({});

  if (!product) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border p-8 text-center",
          className,
        )}
      >
        <span className="text-sm font-medium">No product on screen yet</span>
        <span className="text-sm text-muted-foreground">
          When the creator lands on a product, it shows up here.
        </span>
      </div>
    );
  }

  const saved = wishlist.includes(product.id);
  const myVote = voted[product.id];
  const totalVotes = product.votes.buy + product.votes.skip;
  const buyPct = totalVotes ? Math.round((product.votes.buy / totalVotes) * 100) : 0;

  function vote(choice: "buy" | "skip") {
    if (myVote) return;
    castVote(product!.id, choice);
    setVoted((v) => ({ ...v, [product!.id]: choice }));
  }

  function shop() {
    recordClick(product!.id);
    toast.success("Opening retailer…", { description: product!.retailer });
    window.open(product!.affiliateUrl, "_blank", "noopener,noreferrer");
  }

  function save() {
    toggleWishlist(product!.id);
    toast(saved ? "Removed from wishlist" : "Saved to wishlist", {
      description: product!.name,
    });
  }

  return (
    <div className={cn("rounded-xl border border-border bg-card p-4", className)}>
      <div className="flex items-center justify-between gap-2 pb-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Current product
        </span>
        {product.verdict && <VerdictBadge verdict={product.verdict} />}
      </div>

      <div className="flex gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.imageUrl}
          alt={product.name}
          className="h-24 w-24 shrink-0 rounded-lg object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-semibold leading-tight">{product.name}</h3>
            <span className="shrink-0 text-lg font-semibold">
              {formatPrice(product.price, product.currency)}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{product.retailer}</span>
            <Badge variant="secondary" className="font-normal">
              {product.commissionRate}% commission
            </Badge>
          </div>
          {product.note && (
            <p className="mt-2 border-l-2 border-border pl-2 text-sm italic text-foreground/80">
              “{product.note}”
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={shop} className="flex-1">
          Shop product
        </Button>
        <Button variant={saved ? "secondary" : "outline"} onClick={save}>
          {saved ? "★ Saved" : "☆ Save"}
        </Button>
      </div>

      {/* Buy / Skip poll */}
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
          <span>Should Peter buy it?</span>
          <span>{totalVotes} votes</span>
        </div>
        <Progress value={buyPct} className="h-2" />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button
            variant={myVote === "buy" ? "default" : "outline"}
            size="sm"
            disabled={!!myVote}
            onClick={() => vote("buy")}
          >
            🔥 Buy · {product.votes.buy}
          </Button>
          <Button
            variant={myVote === "skip" ? "default" : "outline"}
            size="sm"
            disabled={!!myVote}
            onClick={() => vote("skip")}
          >
            👎 Skip · {product.votes.skip}
          </Button>
        </div>
        {myVote && (
          <p className="mt-1.5 text-center text-xs text-muted-foreground">
            You voted {myVote === "buy" ? "Buy" : "Skip"} · {buyPct}% say buy
          </p>
        )}
      </div>
    </div>
  );
}
