"use client";

import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/format";
import type { Product, Verdict } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

export const verdictMeta: Record<
  Verdict,
  { label: string; emoji: string; className: string; dot: string }
> = {
  buy: {
    label: "Buy",
    emoji: "🔥",
    className: "border-emerald-500/40 text-emerald-500",
    dot: "bg-emerald-500",
  },
  maybe: {
    label: "Maybe",
    emoji: "🤔",
    className: "border-amber-500/40 text-amber-500",
    dot: "bg-amber-500",
  },
  skip: {
    label: "Skip",
    emoji: "👎",
    className: "border-rose-500/40 text-rose-500",
    dot: "bg-rose-500",
  },
};

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const m = verdictMeta[verdict];
  return (
    <Badge variant="outline" className={cn("gap-1", m.className)}>
      <span aria-hidden>{m.emoji}</span>
      {m.label}
    </Badge>
  );
}

interface ProductCardProps {
  product: Product;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

/** Compact card used in the shopping trail and replay grid. */
export function ProductCard({ product, active, onClick, className }: ProductCardProps) {
  const rejected = product.verdict === "skip";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-40 shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-card text-left transition",
        "hover:border-ring/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active && "border-ring ring-2 ring-ring",
        rejected && "opacity-55",
        className,
      )}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.imageUrl}
          alt={product.name}
          className={cn(
            "h-full w-full object-cover transition group-hover:scale-105",
            rejected && "grayscale",
          )}
        />
        {product.pinned && (
          <span className="absolute left-1.5 top-1.5 rounded bg-background/80 px-1.5 py-0.5 text-[10px] font-medium backdrop-blur">
            📌 Pinned
          </span>
        )}
        {product.verdict && (
          <span
            className={cn(
              "absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-background",
              verdictMeta[product.verdict].dot,
            )}
          />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-0.5 p-2">
        <span
          className={cn(
            "line-clamp-1 text-xs font-medium",
            rejected && "line-through",
          )}
        >
          {product.name}
        </span>
        <span className="text-xs text-muted-foreground">
          {formatPrice(product.price, product.currency)}
        </span>
      </div>
    </button>
  );
}
