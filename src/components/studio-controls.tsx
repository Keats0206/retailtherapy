"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { AudienceVotes } from "@/components/audience-votes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Panel,
  PanelContent,
  PanelHeader,
} from "@/components/ui/panel";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/lib/format";
import type { Product, VoteTally } from "@/lib/types";

/**
 * Host-side controls: paste a retailer URL, resolve it through Channel3, and
 * pin it on-screen for every viewer.
 *
 * The lookup goes through our own route (not Channel3 directly) so the API key
 * stays server-side and only signed-in hosts can spend credits.
 */
/** The real lookup: our route holds the API key and requires sign-in. */
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
  votes,
  onPin,
  onUnpin,
  onNote,
  onResolve = lookupProduct,
  channel3Configured = true,
  className,
}: {
  pinned: Product | null;
  votes?: VoteTally;
  onPin: (product: Product) => void;
  onUnpin: () => void;
  onNote: (productId: string, note: string) => void;
  /**
   * How a pasted URL becomes a product. Defaults to the Channel3 lookup;
   * /prototype swaps in a local resolver so it needs no API key.
   */
  onResolve?: (url: string) => Promise<Product>;
  /** When false, shows setup guidance instead of the pin form. */
  channel3Configured?: boolean;
  className?: string;
}) {
  const [url, setUrl] = useState("");
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resolve(e: React.FormEvent) {
    e.preventDefault();
    const value = url.trim();
    if (!value || resolving) return;

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

  return (
    // The primary action while live, so it's the one card that carries the
    // accent border rather than the default hairline.
    <Panel accent className={className}>
      <PanelHeader className="gap-1.5">
        <h2 className="text-base font-semibold text-foreground">Add a link</h2>
        <p className="text-sm text-muted-foreground">
          Paste a retailer link to put it on screen for every viewer.
        </p>
      </PanelHeader>

      <PanelContent className="flex flex-col gap-4">
        {!channel3Configured ? (
          <p className="border-l-2 border-muted-foreground/40 py-1 pl-3 text-sm leading-relaxed text-muted-foreground">
            Adding links requires a Channel3 API key. Add{" "}
            <code className="text-foreground">CHANNEL3_API_KEY</code> to{" "}
            <code className="text-foreground">.env.local</code> and restart the
            dev server.
          </p>
        ) : (
          <form onSubmit={resolve} className="flex flex-col gap-2.5">
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
        )}

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
                <span className="micro text-muted-foreground">On screen now</span>
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
                {pinned.imageUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={pinned.imageUrl}
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
      </PanelContent>
    </Panel>
  );
}
