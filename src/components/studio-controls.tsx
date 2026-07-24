"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { AudienceVerseVotes } from "@/components/audience-verse-votes";
import { AudienceVotes } from "@/components/audience-votes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Panel,
  PanelContent,
  PanelHeader,
} from "@/components/ui/panel";
import { Separator } from "@/components/ui/separator";
import { formatPrice, normalizeProductImageUrl } from "@/lib/format";
import type { Product, VoteTally } from "@/lib/types";
import { cn } from "@/lib/utils";

type InteractionMode = "spotlight" | "verse";

/**
 * Host-side controls: paste retailer URLs and start a spotlight or verse
 * interaction for every viewer.
 *
 * The lookup goes through our own route (not Channel3 directly) so the API key
 * stays server-side and only signed-in hosts can spend credits.
 */
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
  verseVotes,
  onPin,
  onUnpin,
  onEndInteraction,
  onStartVerse,
  onNote,
  onResolve = lookupProduct,
  channel3Configured = true,
  className,
}: {
  pinned: Product | null;
  verse: { left: Product; right: Product; id: string } | null;
  votes?: VoteTally;
  verseVotes?: { left: number; right: number };
  onPin: (product: Product) => void;
  onUnpin: () => void;
  onEndInteraction: () => void;
  onStartVerse: (left: Product, right: Product) => void;
  onNote: (productId: string, note: string) => void;
  onResolve?: (url: string) => Promise<Product>;
  channel3Configured?: boolean;
  className?: string;
}) {
  const [mode, setMode] = useState<InteractionMode>("spotlight");
  const [url, setUrl] = useState("");
  const [leftUrl, setLeftUrl] = useState("");
  const [rightUrl, setRightUrl] = useState("");
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const interactionActive = !!pinned || !!verse;
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
    if (!value || resolving || interactionActive) return;

    setResolving(true);
    setError(null);
    try {
      onPin(await onResolve(value));
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
    if (!left || !right || resolving || interactionActive) return;

    setResolving(true);
    setError(null);
    try {
      const [leftProduct, rightProduct] = await Promise.all([
        onResolve(left),
        onResolve(right),
      ]);
      onStartVerse(leftProduct, rightProduct);
      setLeftUrl("");
      setRightUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setResolving(false);
    }
  }

  return (
    <Panel accent className={className}>
      <PanelHeader className="gap-1.5">
        <h2 className="text-base font-semibold text-foreground">
          Interaction
        </h2>
        <p className="text-sm text-muted-foreground">
          Paste links to put a product or A/B matchup on screen for viewers.
        </p>
      </PanelHeader>

      <PanelContent className="flex flex-col gap-4">
        {!interactionActive && (
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
            {(["spotlight", "verse"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  mode === value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {value === "spotlight" ? "Spotlight" : "Verses"}
              </button>
            ))}
          </div>
        )}

        {!channel3Configured ? (
          <p className="border-l-2 border-muted-foreground/40 py-1 pl-3 text-sm leading-relaxed text-muted-foreground">
            Adding links requires a Channel3 API key. Add{" "}
            <code className="text-foreground">CHANNEL3_API_KEY</code> to{" "}
            <code className="text-foreground">.env.local</code> and restart the
            dev server.
          </p>
        ) : !interactionActive && mode === "spotlight" ? (
          <form onSubmit={resolveSpotlight} className="flex flex-col gap-2.5">
            <Input
              id="product-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste a product URL…"
              disabled={resolving}
              aria-label="Product URL"
              className="h-10"
            />
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={resolving || !url.trim()}
            >
              {resolving ? "Resolving…" : "Add link"}
            </Button>
          </form>
        ) : !interactionActive && mode === "verse" ? (
          <form onSubmit={resolveVerse} className="flex flex-col gap-2.5">
            <Input
              id="verse-left-url"
              value={leftUrl}
              onChange={(e) => setLeftUrl(e.target.value)}
              placeholder="Left product URL…"
              disabled={resolving}
              aria-label="Left product URL"
              className="h-10"
            />
            <Input
              id="verse-right-url"
              value={rightUrl}
              onChange={(e) => setRightUrl(e.target.value)}
              placeholder="Right product URL…"
              disabled={resolving}
              aria-label="Right product URL"
              className="h-10"
            />
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={resolving || !leftUrl.trim() || !rightUrl.trim()}
            >
              {resolving ? "Resolving…" : "Start verse"}
            </Button>
          </form>
        ) : null}

        {error && (
          <p className="border-l-2 border-destructive py-1 pl-3 text-sm text-destructive">
            {error}
          </p>
        )}

        {pinned && (
          <>
            <Separator />
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <span className="micro text-muted-foreground">
                  Spotlight on screen
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onUnpin}
                  className="shrink-0 text-muted-foreground"
                >
                  <X />
                  Remove
                </Button>
              </div>

              <div className="flex gap-3">
                {pinnedImageUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={pinnedImageUrl}
                    alt={pinned.name}
                    className="size-20 shrink-0 rounded-lg bg-muted object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate font-medium text-foreground"
                    title={pinned.name}
                  >
                    {pinned.name}
                  </p>
                  <p className="mt-0.5 text-sm tabular-nums">
                    {formatPrice(pinned.price, pinned.currency)}
                  </p>
                  {pinned.retailer && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {pinned.retailer}
                    </p>
                  )}
                </div>
              </div>

              <Input
                value={pinned.note}
                onChange={(e) => onNote(pinned.id, e.target.value)}
                placeholder="Add a note viewers will see…"
                aria-label="Note about this product"
              />
              {votes && <AudienceVotes votes={votes} className="pt-0.5" />}
            </div>
          </>
        )}

        {verse && (
          <>
            <Separator />
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <span className="micro text-muted-foreground">
                  Verse on screen
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onEndInteraction}
                  className="shrink-0 text-muted-foreground"
                >
                  <X />
                  End verse
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="min-w-0">
                  {leftImageUrl && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={leftImageUrl}
                      alt={verse.left.name}
                      className="aspect-square w-full rounded-lg bg-muted object-cover"
                    />
                  )}
                  <p className="micro mt-1.5 text-muted-foreground">Left</p>
                  <p className="truncate text-sm font-medium">{verse.left.name}</p>
                </div>
                <div className="min-w-0">
                  {rightImageUrl && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={rightImageUrl}
                      alt={verse.right.name}
                      className="aspect-square w-full rounded-lg bg-muted object-cover"
                    />
                  )}
                  <p className="micro mt-1.5 text-muted-foreground">Right</p>
                  <p className="truncate text-sm font-medium">
                    {verse.right.name}
                  </p>
                </div>
              </div>

              {verseVotes && (
                <AudienceVerseVotes votes={verseVotes} className="pt-0.5" />
              )}
            </div>
          </>
        )}
      </PanelContent>
    </Panel>
  );
}
