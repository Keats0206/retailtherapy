"use client";

import { cn } from "@/lib/utils";
import type { Product } from "@/lib/types";
import { ProductCard } from "@/components/product-card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface ShoppingTrailProps {
  products: Product[];
  currentProductId: string | null;
  onSelect?: (id: string) => void;
  className?: string;
}

export function ShoppingTrail({
  products,
  currentProductId,
  onSelect,
  className,
}: ShoppingTrailProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-3", className)}>
      <div className="flex items-center justify-between px-1 pb-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Shopping trail
        </span>
        <span className="text-xs text-muted-foreground">
          {products.length} viewed
        </span>
      </div>
      {products.length === 0 ? (
        <p className="px-1 py-4 text-sm text-muted-foreground">
          Products the creator views will collect here.
        </p>
      ) : (
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-3 pb-3">
            {[...products]
              .sort((a, b) => a.addedAt - b.addedAt)
              .map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  active={p.id === currentProductId}
                  onClick={onSelect ? () => onSelect(p.id) : undefined}
                />
              ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}
    </div>
  );
}
