"use client";

import { useState } from "react";
import { Check, Link2, Sparkles, Swords } from "lucide-react";

import { AudienceVerseVotes } from "@/components/audience-verse-votes";
import { AudienceVotes } from "@/components/audience-votes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice, normalizeProductImageUrl } from "@/lib/format";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";
import type { Product, VoteRecord, VoteTally } from "@/lib/types";
import { cn } from "@/lib/utils";

type InteractionMode = "spotlight" | "verse";

async function lookupProduct(url: string): Promise<Product> {
  const res = await fetch("/api/products/lookup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Lookup failed");
  return data.product as Product;
}

export function StudioControls({
  pinned,
  verse,
  votes,
  voters,
  verseVotes,
  onPin,
  onUnpin,
  onEndInteraction,
  onStartVerse,
  onNote,
  onSetFeatured,
  onResolve = lookupProduct,
  channel3Configured = true,
  className,
  variant = "panel",
}: {
  pinned: Product | null;
  verse: { left: Product; right: Product; id: string } | null;
  votes?: VoteTally;
  voters?: VoteRecord[];
  verseVotes?: { left: number; right: number };
  onPin: (product: Product) => void;
  onUnpin: () => void;
  onEndInteraction: () => void;
  onStartVerse: (left: Product, right: Product) => void;
  onNote: (productId: string, note: string) => void;
  onSetFeatured?: (productId: string, featured: boolean) => void;
  onResolve?: (url: string) => Promise<Product>;
  channel3Configured?: boolean;
  className?: string;
  variant?: "panel" | "rail" | "pip";
}) {
  const [mode, setMode] = useState<InteractionMode>("spotlight");
  const [url, setUrl] = useState("");
  const [leftUrl, setLeftUrl] = useState("");
  const [rightUrl, setRightUrl] = useState("");
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pinnedImageUrl = pinned
    ? normalizeProductImageUrl(pinned.imageUrl)
    : null;
  const leftImageUrl = verse
    ? normalizeProductImageUrl(verse.left.imageUrl)
    : null;
  const rightImageUrl = verse
    ? normalizeProductImageUrl(verse.right.imageUrl)
    : null;

  async function resolveSpotlight(e: React.FormEvent) {
    e.preventDefault();
    const value = url.trim();
    if (!value || resolving) return;

    setResolving(true);
    setError(null);
    try {
      onPin(await onResolve(value));
      trackEvent(AnalyticsEvent.HOST_PRODUCT_ADD, { area: "host_studio" });
      setUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setResolving(false);
    }
  }

  async function resolveVerse(e: React.FormEvent) {
    e.preventDefault();
    const left = leftUrl.trim();
    const right = rightUrl.trim();
    if (!left || !right || resolving) return;

    setResolving(true);
    setError(null);
    try {
      const [leftProduct, rightProduct] = await Promise.all([
        onResolve(left),
        onResolve(right),
      ]);
      onStartVerse(leftProduct, rightProduct);
      trackEvent(AnalyticsEvent.HOST_VERSE_START, { area: "host_studio" });
      setLeftUrl("");
      setRightUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setResolving(false);
    }
  }

  const isRail = variant === "rail" || variant === "pip";
  const isPip = variant === "pip";

  return (
    <div
      className={cn(
        "flex flex-col",
        isRail ? (isPip ? "gap-0 p-0 text-sm" : "gap-0 p-0") : "gap-3 rounded-xl bg-card py-4 ring-1 ring-foreground/10",
        className,
      )}
    >
      {/* Active interaction — compact banner when something is on screen */}
      {pinned && (
        <ActiveSpotlight
          product={pinned}
          imageUrl={pinnedImageUrl}
          votes={votes}
          voters={voters}
          onDone={onUnpin}
          onNote={onNote}
          onSetFeatured={onSetFeatured}
          isRail={isRail}
        />
      )}

      {verse && (
        <ActiveVerse
          verse={verse}
          leftImageUrl={leftImageUrl}
          rightImageUrl={rightImageUrl}
          verseVotes={verseVotes}
          onEnd={onEndInteraction}
          isRail={isRail}
        />
      )}

      {/* Add form — always available so the host can keep building the trail */}
      <div className={cn(isRail && (isPip ? "p-3" : "p-4"))}>
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-foreground">
            Add to trail
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Paste a product link — it joins the trail and goes on screen.
          </p>
        </div>

        <div className="mb-4 flex gap-1 rounded-lg border border-border/60 p-1">
          {(
            [
              { id: "spotlight" as const, label: "Spotlight", icon: Sparkles },
              { id: "verse" as const, label: "Verses", icon: Swords },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setMode(id);
                trackEvent(AnalyticsEvent.HOST_MODE_SWITCH, {
                  area: "host_studio",
                  mode: id,
                });
              }}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-all",
                mode === id
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>

        {!channel3Configured ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-4 text-sm leading-relaxed text-muted-foreground">
            Product lookup is temporarily unavailable. Try again later or paste
            links manually.
          </p>
        ) : mode === "spotlight" ? (
          <form onSubmit={resolveSpotlight} className="flex flex-col gap-3">
            <div className="relative">
              <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="product-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste a product URL…"
                disabled={resolving}
                aria-label="Product URL"
                className="h-11 pl-10"
              />
            </div>
            <Button
              type="submit"
              className="h-11 w-full bg-foreground text-background hover:bg-foreground/90"
              disabled={resolving || !url.trim()}
            >
              {resolving ? "Resolving…" : "Add to trail"}
            </Button>
          </form>
        ) : (
          <form onSubmit={resolveVerse} className="flex flex-col gap-3">
            <Input
              id="verse-left-url"
              value={leftUrl}
              onChange={(e) => setLeftUrl(e.target.value)}
              placeholder="Left product URL…"
              disabled={resolving}
              aria-label="Left product URL"
              className="h-11"
            />
            <Input
              id="verse-right-url"
              value={rightUrl}
              onChange={(e) => setRightUrl(e.target.value)}
              placeholder="Right product URL…"
              disabled={resolving}
              aria-label="Right product URL"
              className="h-11"
            />
            <Button
              type="submit"
              className="h-11 w-full bg-foreground text-background hover:bg-foreground/90"
              disabled={resolving || !leftUrl.trim() || !rightUrl.trim()}
            >
              {resolving ? "Resolving…" : "Start verse"}
            </Button>
          </form>
        )}

        {error && (
          <p
            className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

function ActiveSpotlight({
  product,
  imageUrl,
  votes,
  voters,
  onDone,
  onNote,
  onSetFeatured,
  isRail,
}: {
  product: Product;
  imageUrl: string | null;
  votes?: VoteTally;
  voters?: VoteRecord[];
  onDone: () => void;
  onNote: (productId: string, note: string) => void;
  onSetFeatured?: (productId: string, featured: boolean) => void;
  isRail: boolean;
}) {
  return (
    <div
      className={cn(
        "border-b border-border/60 bg-live/5",
        isRail ? "p-4" : "px-4 pb-4",
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="micro text-live">On screen now</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDone}
          className="h-7 gap-1 px-2 text-xs text-muted-foreground"
        >
          <Check className="size-3.5" />
          Done
        </Button>
      </div>

      <div className="flex gap-3 rounded-xl bg-muted/50 p-3">
        {imageUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={imageUrl}
            alt={product.name}
            className="size-16 shrink-0 rounded-lg bg-muted object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-foreground" title={product.name}>
            {product.name}
          </p>
          <p className="mt-0.5 text-sm tabular-nums text-muted-foreground">
            {formatPrice(product.price, product.currency)}
          </p>
          {product.retailer && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {product.retailer}
            </p>
          )}
        </div>
      </div>

      <Input
        value={product.note}
        onChange={(e) => onNote(product.id, e.target.value)}
        placeholder="Add a note for viewers…"
        aria-label="Note about this product"
        className="mt-3 h-10"
      />

      {onSetFeatured && (
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(product.featured)}
            onChange={(e) => onSetFeatured(product.id, e.target.checked)}
            className="size-4 rounded border-border accent-live"
          />
          <span className="text-muted-foreground">
            Feature at top of replay
            {product.featured ? " (sponsored placement)" : ""}
          </span>
        </label>
      )}

      {votes && (
        <AudienceVotes votes={votes} voters={voters} className="mt-3" />
      )}
    </div>
  );
}

function ActiveVerse({
  verse,
  leftImageUrl,
  rightImageUrl,
  verseVotes,
  onEnd,
  isRail,
}: {
  verse: { left: Product; right: Product; id: string };
  leftImageUrl: string | null;
  rightImageUrl: string | null;
  verseVotes?: { left: number; right: number };
  onEnd: () => void;
  isRail: boolean;
}) {
  return (
    <div
      className={cn(
        "border-b border-border/60 bg-live/5",
        isRail ? "p-4" : "px-4 pb-4",
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="micro text-live">Verse on screen</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onEnd}
          className="h-7 gap-1 px-2 text-xs text-muted-foreground"
        >
          <Check className="size-3.5" />
          Done
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          { product: verse.left, imageUrl: leftImageUrl, label: "A" },
          { product: verse.right, imageUrl: rightImageUrl, label: "B" },
        ].map(({ product, imageUrl, label }) => (
          <div key={product.id} className="min-w-0 rounded-xl bg-muted/50 p-2">
            {imageUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={imageUrl}
                alt={product.name}
                className="aspect-square w-full rounded-lg bg-muted object-cover"
              />
            )}
            <p className="micro mt-1.5 text-muted-foreground">{label}</p>
            <p className="truncate text-xs font-medium">{product.name}</p>
          </div>
        ))}
      </div>

      {verseVotes && (
        <AudienceVerseVotes votes={verseVotes} className="mt-3" />
      )}
    </div>
  );
}
