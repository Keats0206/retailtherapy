"use client";

import { AudienceVotes } from "@/components/audience-votes";
import { Badge } from "@/components/ui/badge";
import {
  Panel,
  PanelAction,
  PanelContent,
  PanelHeader,
  PanelTitle,
} from "@/components/ui/panel";
import { formatPrice } from "@/lib/format";
import type { Product, VoteTally } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Every product pinned so far this stream. This is the thing that turns a
 * stream into a shoppable collection — it's what a replay page would render.
 */
export function ShoppingTrail({
  products,
  pinnedId,
  onSelect,
  votesFor,
  size = "compact",
  className,
}: {
  products: Product[];
  pinnedId: string | null;
  /** Host-only: re-pin an earlier product. */
  onSelect?: (product: Product) => void;
  /** Host-only: show buy/skip tallies per trail item. */
  votesFor?: (productId: string) => VoteTally;
  /** Host studio uses larger cards; viewer sheet stays compact. */
  size?: "compact" | "comfortable";
  className?: string;
}) {
  const comfortable = size === "comfortable";
  return (
    <Panel className={className}>
      <PanelHeader>
        <PanelTitle>Shopping trail</PanelTitle>
        <PanelAction>
          <Badge variant="secondary" className="tabular-nums">
            {products.length}
          </Badge>
        </PanelAction>
      </PanelHeader>

      <PanelContent>
        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Links you add will collect here.
          </p>
        ) : (
          <div
            className={cn(
              comfortable
                ? "grid grid-cols-2 gap-4 sm:grid-cols-2 xl:grid-cols-2"
                : "flex gap-3 overflow-x-auto pb-1",
            )}
          >
            {products.map((p) => {
              const active = p.id === pinnedId;
              const votes = votesFor?.(p.id);
              const Wrapper = onSelect ? "button" : "div";
              return (
                <Wrapper
                  key={p.id}
                  {...(onSelect
                    ? { onClick: () => onSelect(p), type: "button" as const }
                    : {})}
                  className={cn(
                    "group rounded-lg border p-3 text-left transition-all",
                    comfortable ? "w-full" : "w-32 shrink-0 p-2",
                    // Selection reads as focus, not decoration: the active item
                    // is at full strength and everything else recedes.
                    active
                      ? "border-primary/40 bg-accent opacity-100"
                      : "border-transparent opacity-50 hover:opacity-100",
                    onSelect &&
                      "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  )}
                >
                  {p.imageUrl && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className={cn(
                        "mb-2 aspect-square w-full rounded-md bg-muted object-cover",
                        comfortable && "mb-3",
                      )}
                    />
                  )}
                  <p
                    className={cn(
                      "truncate font-medium",
                      comfortable ? "text-sm" : "text-xs",
                    )}
                    title={p.name}
                  >
                    {p.name}
                  </p>
                  <p
                    className={cn(
                      "tabular-nums text-muted-foreground",
                      comfortable ? "text-sm" : "text-xs",
                    )}
                  >
                    {formatPrice(p.price, p.currency)}
                  </p>
                  {votes && (
                    <AudienceVotes votes={votes} compact className="mt-0" />
                  )}
                </Wrapper>
              );
            })}
          </div>
        )}
      </PanelContent>
    </Panel>
  );
}
