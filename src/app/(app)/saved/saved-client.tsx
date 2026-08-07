"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, Bookmark } from "lucide-react";

import { SaveButton } from "@/components/save-button";
import { ShowCard, discoveryShowVariant } from "@/components/show-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";
import {
  cleanProductTitle,
  formatPrice,
  normalizeProductImageUrl,
} from "@/lib/format";
import type { SavedProduct } from "@/lib/saved";
import type { DiscoveryShow } from "@/lib/shows";
import { viewerShowPath } from "@/lib/show-urls";
import { cn } from "@/lib/utils";

/**
 * The board: everything this viewer saved, newest first.
 *
 * Deliberately flat — no collections, no folders. The one affordance for a
 * board that has grown is the retailer filter, derived from the items already
 * loaded rather than a second query.
 *
 * Rows unsave through the same `SaveButton` the rest of the app uses, so the
 * item disappears from the shared provider state and every other surface
 * showing it updates in the same tick.
 */

const ALL = "__all__";

export function SavedClient({
  items,
  shows,
}: {
  items: SavedProduct[];
  shows: DiscoveryShow[];
}) {
  const [retailer, setRetailer] = useState<string>(ALL);

  const retailers = useMemo(() => {
    const counts = new Map<string, number>();
    for (const { product } of items) {
      if (!product.retailer) continue;
      counts.set(product.retailer, (counts.get(product.retailer) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [items]);

  const visible = useMemo(
    () =>
      retailer === ALL
        ? items
        : items.filter(({ product }) => product.retailer === retailer),
    [items, retailer],
  );

  const isEmpty = items.length === 0 && shows.length === 0;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 pb-16 pt-2">
      <header className="flex flex-wrap items-end justify-between gap-3 pb-6">
        <div>
          <h1 className="font-heading text-3xl font-medium tracking-tight">
            Saved
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isEmpty
              ? "Things you save while watching land here."
              : "Everything you kept, ready to shop."}
          </p>
        </div>
        {items.length > 0 && (
          <Badge variant="secondary" className="tabular-nums">
            {items.length} {items.length === 1 ? "item" : "items"}
          </Badge>
        )}
      </header>

      {isEmpty ? <EmptyBoard /> : null}

      {shows.length > 0 && (
        <section className="pb-10">
          <h2 className="micro pb-3 text-muted-foreground">Saved shows</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shows.map((show) => (
              <SavedShowCard key={show.slug} show={show} />
            ))}
          </div>
        </section>
      )}

      {items.length > 0 && (
        <section>
          <div className="flex flex-wrap items-center gap-2 pb-4">
            <h2 className="micro mr-1 text-muted-foreground">Saved items</h2>
            {retailers.length > 1 && (
              <>
                <FilterChip
                  label="All"
                  count={items.length}
                  active={retailer === ALL}
                  onClick={() => setRetailer(ALL)}
                />
                {retailers.map(([name, count]) => (
                  <FilterChip
                    key={name}
                    label={name}
                    count={count}
                    active={retailer === name}
                    onClick={() => setRetailer(name)}
                  />
                ))}
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((entry) => (
              <SavedItemCard key={entry.product.id} entry={entry} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function EmptyBoard() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-none bg-card px-6 py-16 text-center ring-1 ring-foreground/5">
      <Bookmark className="size-8 text-muted-foreground/60" />
      <div>
        <p className="font-medium">Nothing saved yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Tap the bookmark on anything a host pins and it&apos;ll be here.
        </p>
      </div>
      <Button render={<Link href="/browse">Find a show</Link>} size="sm" />
    </div>
  );
}

function SavedShowCard({ show }: { show: DiscoveryShow }) {
  return (
    <ShowCard
      show={show}
      variant={discoveryShowVariant(show)}
      area="saved"
    />
  );
}

function SavedItemCard({ entry }: { entry: SavedProduct }) {
  const { product, source } = entry;
  const imageUrl = normalizeProductImageUrl(product.imageUrl);
  const name = cleanProductTitle(product.name, product.retailer);

  return (
    <article className="group flex flex-col">
      <div className="relative">
        <a
          href={product.buyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block overflow-hidden bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() =>
            trackEvent(AnalyticsEvent.SAVED_SHOP_CLICK, { area: "saved" })
          }
        >
          {imageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={imageUrl}
              alt={name}
              loading="lazy"
              decoding="async"
              className="aspect-[3/4] w-full object-contain p-4 transition-transform duration-500 group-hover:scale-[1.02]"
            />
          ) : (
            <span className="flex aspect-[3/4] w-full items-center justify-center text-xs text-muted-foreground">
              No image
            </span>
          )}
        </a>
        <SaveButton
          product={product}
          area="saved"
          variant="overlay"
          className="absolute right-2 top-2 z-10"
        />
      </div>

      <div className="flex flex-col gap-1.5 pt-3">
        {product.retailer ? (
          <p className="micro truncate uppercase tracking-[0.14em] text-muted-foreground">
            {product.retailer}
          </p>
        ) : null}
        <a
          href={product.buyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="line-clamp-2 text-sm font-medium leading-snug hover:underline"
          title={name}
          onClick={() =>
            trackEvent(AnalyticsEvent.SAVED_SHOP_CLICK, { area: "saved" })
          }
        >
          {name}
        </a>
        <p className="text-base font-medium tabular-nums tracking-tight">
          {formatPrice(product.price, product.currency)}
        </p>

        {product.note ? (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {product.note}
          </p>
        ) : null}

        {source ? (
          <Link
            href={viewerShowPath(source.slug)}
            className="truncate text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            From {source.host}&apos;s {source.title}
          </Link>
        ) : null}

        <Button
          variant="outline"
          size="micro"
          className="mt-1 w-fit"
          render={
            <a
              href={product.buyUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                trackEvent(AnalyticsEvent.SAVED_SHOP_CLICK, { area: "saved" })
              }
            />
          }
        >
          Shop
          <ArrowUpRight className="size-3.5" />
        </Button>
      </div>
    </article>
  );
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-none px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-foreground text-background"
          : "bg-muted text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
      <span className="ml-1.5 tabular-nums opacity-60">{count}</span>
    </button>
  );
}
