"use client";

import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/format";
import type { Product, Session, Verdict } from "@/lib/types";
import {
  addProduct,
  setCurrentProduct,
  setNote,
  setStreamStatus,
  setVerdict,
  togglePin,
} from "@/lib/store";
import { lookupProduct } from "@/lib/services/products";
import { seedProducts } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface StudioControlsProps {
  session: Session;
  products: Product[];
  currentProduct: Product | null;
  sharing: boolean;
  onToggleShare: () => void;
  className?: string;
}

export function StudioControls({
  session,
  products,
  currentProduct,
  sharing,
  onToggleShare,
  className,
}: StudioControlsProps) {
  const live = session.status === "live";
  const [url, setUrl] = useState("");
  const [resolving, setResolving] = useState(false);

  const totalClicks = products.reduce((s, p) => s + p.clicks, 0);
  const totalVotes = products.reduce((s, p) => s + p.votes.buy + p.votes.skip, 0);

  async function resolve(rawUrl: string) {
    const value = rawUrl.trim();
    if (!value || resolving) return;
    setResolving(true);
    try {
      const product = await lookupProduct(value);
      addProduct(product);
      setUrl("");
      toast.success("Product added", {
        description: `${product.name} · ${formatPrice(product.price, product.currency)}`,
      });
    } catch {
      toast.error("Couldn't resolve that URL");
    } finally {
      setResolving(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Stream + screen controls */}
      <div className="flex flex-wrap gap-2">
        {live ? (
          <Button
            variant="destructive"
            onClick={() => {
              setStreamStatus("ended");
              if (sharing) onToggleShare();
              toast("Stream ended");
            }}
          >
            End stream
          </Button>
        ) : (
          <Button
            onClick={() => {
              setStreamStatus("live");
              toast.success("You're live");
            }}
          >
            Go live
          </Button>
        )}
        <Button
          variant={sharing ? "secondary" : "outline"}
          disabled={!live}
          onClick={onToggleShare}
        >
          {sharing ? "Stop sharing" : "Share screen"}
        </Button>
      </div>

      <Separator />

      {/* Add product by URL */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="product-url">Add current URL</Label>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            resolve(url);
          }}
        >
          <Input
            id="product-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste a product URL…"
            disabled={resolving}
          />
          <Button type="submit" disabled={resolving || !url.trim()}>
            {resolving ? "Resolving…" : "Add"}
          </Button>
        </form>
        <div className="flex flex-wrap gap-1.5">
          <span className="self-center text-xs text-muted-foreground">Try:</span>
          {seedProducts.slice(0, 3).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => resolve(p.url)}
              disabled={resolving}
              className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground transition hover:border-ring hover:text-foreground disabled:opacity-50"
            >
              {p.retailer}
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Current product editor */}
      <div className="flex flex-col gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Current product
        </span>
        {currentProduct ? (
          <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentProduct.imageUrl}
                alt=""
                className="h-14 w-14 rounded-md object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  {currentProduct.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatPrice(currentProduct.price, currentProduct.currency)} ·{" "}
                  {currentProduct.retailer}
                </div>
              </div>
              <Button
                variant={currentProduct.pinned ? "secondary" : "outline"}
                size="sm"
                onClick={() => togglePin(currentProduct.id)}
              >
                {currentProduct.pinned ? "📌 Pinned" : "Pin"}
              </Button>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Verdict</Label>
              <ToggleGroup
                value={currentProduct.verdict ? [currentProduct.verdict] : []}
                onValueChange={(v) => {
                  const choice = (v as string[])[0];
                  if (choice) setVerdict(currentProduct.id, choice as Verdict);
                }}
                className="justify-start"
                variant="outline"
              >
                <ToggleGroupItem value="buy">🔥 Buy</ToggleGroupItem>
                <ToggleGroupItem value="maybe">🤔 Maybe</ToggleGroupItem>
                <ToggleGroupItem value="skip">👎 Skip</ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="commentary" className="text-xs text-muted-foreground">
                Commentary
              </Label>
              <Input
                id="commentary"
                defaultValue={currentProduct.note}
                key={currentProduct.id}
                placeholder="e.g. Great cut, but I'd wait for a sale."
                onBlur={(e) => setNote(currentProduct.id, e.target.value)}
              />
            </div>

            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>🔥 {currentProduct.votes.buy} buy</span>
              <span>👎 {currentProduct.votes.skip} skip</span>
              <span>🖱 {currentProduct.clicks} clicks</span>
            </div>
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
            Add a URL above to put a product on screen.
          </p>
        )}
      </div>

      <Separator />

      {/* Engagement readout */}
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Clicks" value={totalClicks} />
        <Stat label="Votes" value={totalVotes} />
        <Stat label="Products" value={products.length} />
      </div>

      {products.length > 1 && (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Jump to product</span>
          <div className="flex flex-wrap gap-1.5">
            {products.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setCurrentProduct(p.id)}
                className={cn(
                  "rounded-full border px-2 py-0.5 text-xs transition",
                  p.id === currentProduct?.id
                    ? "border-ring bg-secondary text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {p.name.split(" ").slice(0, 2).join(" ")}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border p-3 text-center">
      <div className="font-mono text-xl font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
