"use client";

import { useState } from "react";

import { Button, Input } from "@/components/ui";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Host-side controls: paste a retailer URL, resolve it through Channel3, and
 * pin it on-screen for every viewer.
 *
 * The lookup goes through our own route (not Channel3 directly) so the API key
 * stays server-side and only allowlisted hosts can spend credits.
 */
export function StudioControls({
  pinned,
  onPin,
  onUnpin,
  onNote,
  className,
}: {
  pinned: Product | null;
  onPin: (product: Product) => void;
  onUnpin: () => void;
  onNote: (productId: string, note: string) => void;
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
      const res = await fetch("/api/products/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lookup failed");
      onPin(data.product as Product);
      setUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setResolving(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <form onSubmit={resolve} className="flex flex-col gap-2">
        <label
          htmlFor="product-url"
          className="text-xs font-semibold uppercase tracking-wide text-zinc-500"
        >
          Pin a product
        </label>
        <div className="flex gap-2">
          <Input
            id="product-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste a product URL…"
            disabled={resolving}
          />
          <Button type="submit" disabled={resolving || !url.trim()}>
            {resolving ? "Resolving…" : "Pin"}
          </Button>
        </div>
      </form>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {pinned && (
        <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-medium" title={pinned.name}>
              {pinned.name}
            </span>
            <Button variant="outline" size="sm" onClick={onUnpin}>
              Unpin
            </Button>
          </div>
          <Input
            value={pinned.note}
            onChange={(e) => onNote(pinned.id, e.target.value)}
            placeholder="Add a note viewers will see…"
            aria-label="Note about this product"
          />
        </div>
      )}
    </div>
  );
}
