"use client";

import Link from "next/link";
import { toast } from "sonner";
import { useAppState, recordClick } from "@/lib/store";
import { useGuest } from "@/lib/use-guest";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";
import { CreatorHeader } from "@/components/creator-header";
import { VerdictBadge } from "@/components/product-card";
import { toggleWishlist, useWishlist } from "@/lib/wishlist";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

export default function ReplayPage() {
  const { creator, session, products } = useAppState();
  useGuest();
  const wishlist = useWishlist();

  const totalClicks = products.reduce((s, p) => s + p.clicks, 0);
  const totalVotes = products.reduce((s, p) => s + p.votes.buy + p.votes.skip, 0);
  const ranked = [...products].sort(
    (a, b) => b.votes.buy - a.votes.buy || b.clicks - a.clicks,
  );
  const topVotes = ranked[0]?.votes.buy ?? 0;

  function shop(p: Product) {
    recordClick(p.id);
    window.open(p.affiliateUrl, "_blank", "noopener,noreferrer");
  }

  if (products.length === 0) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <h1 className="text-xl font-semibold">No replay yet</h1>
        <p className="text-muted-foreground">
          Run a stream in the studio — add a few products and end it — and this becomes a
          shoppable collection.
        </p>
        <Button render={<Link href={`/${creator.handle}/studio`} />}>
          Open studio
        </Button>
      </main>
    );
  }

  return (
    <main className="flex w-full flex-1 flex-col gap-5 p-4">
      <div className="flex items-center justify-between gap-3">
        <CreatorHeader creator={creator} session={session} className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          render={<Link href={`/${creator.handle}`} />}
        >
          Channel ↗
        </Button>
      </div>

      <div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Replay</Badge>
          <h1 className="text-xl font-semibold">{session.title}</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {products.length} products · {totalVotes} votes · {totalClicks} clicks
        </p>
      </div>

      {/* Recording placeholder */}
      <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl border border-border bg-zinc-950">
        <div className="flex flex-col items-center gap-2 text-white/60">
          <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 text-2xl">
            ▶
          </span>
          <span className="text-sm">Stream recording (placeholder)</span>
        </div>
      </div>

      {/* Most voted */}
      {topVotes > 0 && (
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Most voted
          </h2>
          <div className="flex flex-col gap-3">
            {ranked.slice(0, 3).map((p, i) => (
              <div key={p.id} className="flex items-center gap-3">
                <span className="w-5 text-center font-mono text-sm text-muted-foreground">
                  {i + 1}
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.imageUrl}
                  alt=""
                  className="h-10 w-10 rounded object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{p.name}</div>
                  <Progress
                    value={topVotes ? (p.votes.buy / topVotes) * 100 : 0}
                    className="mt-1 h-1.5"
                  />
                </div>
                <span className="shrink-0 text-sm text-muted-foreground">
                  🔥 {p.votes.buy}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <Separator />

      {/* Products viewed */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Products viewed
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {ranked.map((p) => {
            const saved = wishlist.includes(p.id);
            return (
              <div
                key={p.id}
                className="flex gap-3 rounded-xl border border-border bg-card p-3"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.imageUrl}
                  alt={p.name}
                  className="h-20 w-20 shrink-0 rounded-lg object-cover"
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <span className="truncate text-sm font-medium">{p.name}</span>
                    {p.verdict && <VerdictBadge verdict={p.verdict} />}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatPrice(p.price, p.currency)} · {p.retailer}
                  </div>
                  {p.note && (
                    <p className="mt-1 line-clamp-2 text-xs italic text-foreground/70">
                      “{p.note}”
                    </p>
                  )}
                  <div className="mt-auto flex items-center gap-2 pt-2">
                    <Button size="sm" onClick={() => shop(p)}>
                      Shop
                    </Button>
                    <Button
                      size="sm"
                      variant={saved ? "secondary" : "outline"}
                      onClick={() => {
                        toggleWishlist(p.id);
                        toast(saved ? "Removed from wishlist" : "Saved to wishlist");
                      }}
                    >
                      {saved ? "★" : "☆"}
                    </Button>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {p.commissionRate}% · {p.clicks} clicks
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
