"use client";

import { useMemo, useState } from "react";
import { ExternalLink, ShoppingBag } from "lucide-react";

import { AudienceVotes } from "@/components/audience-votes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Panel,
  PanelAction,
  PanelContent,
  PanelHeader,
  PanelTitle,
} from "@/components/ui/panel";
import { formatPrice, normalizeProductImageUrl } from "@/lib/format";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";
import type { Product, VoteChoice, VoteRecord, VoteTally } from "@/lib/types";
import { TRAIL_SORTS, sortTrailProducts, type TrailSortId } from "@/lib/trail-sort";
import { cn } from "@/lib/utils";

export function ShoppingTrail({
  products,
  pinnedId,
  onSelect,
  votesFor,
  votersFor,
  myVotes,
  onVote,
  size = "compact",
  variant = "panel",
  sortable = false,
  className,
}: {
  products: Product[];
  pinnedId: string | null;
  onSelect?: (product: Product) => void;
  votesFor?: (productId: string) => VoteTally;
  votersFor?: (productId: string) => VoteRecord[];
  myVotes?: Record<string, VoteChoice>;
  onVote?: (productId: string, choice: VoteChoice) => void;
  size?: "compact" | "comfortable";
  variant?: "panel" | "rail" | "feed" | "pip";
  /** Show sort tabs (live viewer). */
  sortable?: boolean;
  className?: string;
}) {
  const comfortable = size === "comfortable";
  const isRail = variant === "rail" || variant === "pip";
  const isFeed = variant === "feed";
  const [sort, setSort] = useState<TrailSortId>("order");

  const sortedProducts = useMemo(() => {
    if (!sortable || !votesFor || sort === "order") return products;
    return sortTrailProducts(products, sort, votesFor);
  }, [products, sort, sortable, votesFor]);

  if (isFeed) {
    return (
      <div className={cn("flex min-h-0 flex-col", className)}>
        <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <ShoppingBag className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              Shopping trail
            </span>
          </div>
          <Badge variant="secondary" className="tabular-nums">
            {products.length}
          </Badge>
        </div>

        {sortable && products.length > 1 && (
          <div className="flex shrink-0 gap-1 border-b border-border/60 px-4 py-2">
            {TRAIL_SORTS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setSort(id)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                  sort === id
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {sortedProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
              <p className="text-sm text-muted-foreground">
                Products the host adds will show up here.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {sortedProducts.map((p, i) => (
                <TrailFeedItem
                  key={p.id}
                  product={p}
                  index={i}
                  active={p.id === pinnedId}
                  votes={votesFor?.(p.id)}
                  voters={votersFor?.(p.id)}
                  myVote={myVotes?.[p.id]}
                  onVote={onVote ? (choice) => onVote(p.id, choice) : undefined}
                  onSelect={onSelect ? () => onSelect(p) : undefined}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  if (isRail) {
    return (
      <div className={cn("flex flex-col", className)}>
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <ShoppingBag className="size-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                No products yet
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Links you add will collect here as a shoppable trail.
              </p>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {products.map((p, i) => {
              const active = p.id === pinnedId;
              const votes = votesFor?.(p.id);
              const imageUrl = normalizeProductImageUrl(p.imageUrl);
              const Wrapper = onSelect ? "button" : "li";
              return (
                <Wrapper
                  key={p.id}
                  {...(onSelect
                    ? { onClick: () => onSelect(p), type: "button" as const }
                    : {})}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                    active
                      ? "bg-live/8"
                      : "hover:bg-muted/50",
                    onSelect &&
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                  )}
                >
                  <span className="micro w-5 shrink-0 tabular-nums text-muted-foreground">
                    {i + 1}
                  </span>
                  {imageUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={imageUrl}
                      alt={p.name}
                      loading="lazy"
                      decoding="async"
                      className="size-12 shrink-0 rounded-lg bg-muted object-cover"
                    />
                  ) : (
                    <div className="size-12 shrink-0 rounded-lg bg-muted" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-sm font-medium text-foreground"
                      title={p.name}
                    >
                      {p.name}
                    </p>
                    <p className="text-xs tabular-nums text-muted-foreground">
                      {formatPrice(p.price, p.currency)}
                    </p>
                    {votes && (
                      <AudienceVotes votes={votes} compact className="mt-0.5" />
                    )}
                  </div>
                  {active && (
                    <Badge size="micro" className="shrink-0 bg-live text-live-foreground">
                      Live
                    </Badge>
                  )}
                </Wrapper>
              );
            })}
          </ul>
        )}
      </div>
    );
  }

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
              const imageUrl = normalizeProductImageUrl(p.imageUrl);
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
                    active
                      ? "border-primary/40 bg-accent opacity-100"
                      : "border-transparent opacity-50 hover:opacity-100",
                    onSelect &&
                      "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  )}
                >
                  {imageUrl && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={imageUrl}
                      alt={p.name}
                      loading="lazy"
                      decoding="async"
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

function TrailFeedItem({
  product,
  index,
  active,
  votes,
  voters,
  myVote,
  onVote,
  onSelect,
}: {
  product: Product;
  index: number;
  active: boolean;
  votes?: VoteTally;
  voters?: VoteRecord[];
  myVote?: VoteChoice;
  onVote?: (choice: VoteChoice) => void;
  onSelect?: () => void;
}) {
  const imageUrl = normalizeProductImageUrl(product.imageUrl);
  const total = (votes?.buy ?? 0) + (votes?.skip ?? 0);
  const buyPct = total ? Math.round(((votes?.buy ?? 0) / total) * 100) : 0;
  const soldOut = product.availability === "OutOfStock";

  return (
    <li
      className={cn(
        "px-4 py-3 transition-colors",
        active && "bg-live/5",
      )}
    >
      <div className="flex gap-3">
        <span className="micro mt-1 w-4 shrink-0 tabular-nums text-muted-foreground">
          {index + 1}
        </span>

        {imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={imageUrl}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className="size-14 shrink-0 rounded-lg bg-muted object-cover"
          />
        ) : (
          <div className="size-14 shrink-0 rounded-lg bg-muted" />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="truncate text-sm font-medium text-foreground">
              {product.name}
            </h3>
            {active && (
              <Badge size="micro" className="shrink-0 bg-live text-live-foreground">
                On screen
              </Badge>
            )}
            {product.featured && (
              <Badge variant="outline" size="micro" className="shrink-0 text-muted-foreground">
                Featured
              </Badge>
            )}
            {soldOut && (
              <Badge variant="outline" size="micro" className="text-muted-foreground">
                Out of stock
              </Badge>
            )}
          </div>

          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-sm tabular-nums text-foreground">
              {formatPrice(product.price, product.currency)}
            </span>
            {product.retailer && (
              <span className="text-xs text-muted-foreground">
                {product.retailer}
              </span>
            )}
          </div>

          {product.note && (
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {product.note}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {product.buyUrl && (
              <Button
                variant="outline"
                size="micro"
                className="h-7 gap-1"
                onClick={() => {
                  trackEvent(AnalyticsEvent.PRODUCT_SHOP_CLICK, {
                    area: "watch",
                    context: "trail",
                  });
                  window.open(product.buyUrl, "_blank", "noopener,noreferrer");
                }}
              >
                <ExternalLink className="size-3" />
                Shop
              </Button>
            )}
            {onSelect && !active && (
              <Button
                variant="ghost"
                size="micro"
                className="h-7 text-muted-foreground"
                onClick={onSelect}
              >
                View on screen
              </Button>
            )}
          </div>

          {onVote && (
            <div className="mt-2.5">
              {total > 0 && (
                <Progress value={buyPct} className="mb-2 h-1 gap-0" />
              )}
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  variant={myVote === "buy" ? "default" : "outline"}
                  size="micro"
                  className="h-7"
                  disabled={!!myVote}
                  onClick={() => {
                    trackEvent(AnalyticsEvent.PRODUCT_VOTE, {
                      area: "watch",
                      context: "trail",
                      choice: "buy",
                    });
                    onVote("buy");
                  }}
                >
                  Buy · {votes?.buy ?? 0}
                </Button>
                <Button
                  variant={myVote === "skip" ? "default" : "outline"}
                  size="micro"
                  className="h-7"
                  disabled={!!myVote}
                  onClick={() => {
                    trackEvent(AnalyticsEvent.PRODUCT_VOTE, {
                      area: "watch",
                      context: "trail",
                      choice: "skip",
                    });
                    onVote("skip");
                  }}
                >
                  Not buy · {votes?.skip ?? 0}
                </Button>
                {myVote && (
                  <span className="text-xs text-muted-foreground">
                    You voted {myVote === "skip" ? "not buy" : myVote}
                  </span>
                )}
              </div>
              {voters && voters.length > 0 && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {voters.map((v) => v.displayName).join(", ")}
                </p>
              )}
            </div>
          )}

          {!onVote && votes && total > 0 && (
            <AudienceVotes votes={votes} voters={voters} compact className="mt-2" />
          )}
        </div>
      </div>
    </li>
  );
}
