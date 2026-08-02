"use client";

import { Check, Lock, Plus, Search, VideoOff } from "lucide-react";

import { cn } from "@/lib/utils";

import { MOCK_PRODUCTS, MOCK_SITES, type MockProduct, type MockSite } from "./mock";

/**
 * The host's browser window — tab strip and all.
 *
 * This is the single most important object in the flow: it's what the host
 * picks in the share dialog, and it's what viewers watch. A hunt spans sites,
 * so the tabs are the point — switching between them mid-show is the show.
 */
export function BrowserWindow({
  sites = MOCK_SITES,
  activeSiteId,
  onSiteChange,
  query,
  budget,
  pinnedIds,
  onPin,
  compact,
  className,
}: {
  sites?: MockSite[];
  activeSiteId: string;
  onSiteChange?: (siteId: string) => void;
  query: string;
  budget?: number | null;
  pinnedIds?: string[];
  onPin?: (product: MockProduct) => void;
  compact?: boolean;
  className?: string;
}) {
  const site = sites.find((s) => s.id === activeSiteId) ?? sites[0];
  const products = MOCK_PRODUCTS.filter((p) => p.siteId === site.id);

  return (
    <div className={cn("flex h-full w-full flex-col bg-white text-zinc-900", className)}>
      {/* Tab strip */}
      <div className="flex shrink-0 items-end gap-px bg-zinc-200 px-2 pt-2">
        {sites.map((tab) => {
          const active = tab.id === site.id;
          return (
            <button
              key={tab.id}
              type="button"
              disabled={!onSiteChange}
              onClick={() => onSiteChange?.(tab.id)}
              className={cn(
                "flex min-w-0 flex-1 items-center gap-1.5 px-3 py-1.5 text-xs",
                active
                  ? "bg-white font-medium text-zinc-900"
                  : "bg-zinc-100 text-zinc-500 hover:bg-zinc-50",
                onSiteChange && "cursor-pointer",
              )}
            >
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: tab.tint }}
              />
              <span className="truncate">{tab.name}</span>
            </button>
          );
        })}
      </div>

      <div className="flex shrink-0 items-center gap-2 border-b border-zinc-200 bg-white px-3 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-500">
          <Lock className="size-3 shrink-0" />
          <span className="truncate">
            {site.domain}/search?q={query.trim().toLowerCase().replace(/\s+/g, "+") || "tank+tops"}
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <div
          className="flex items-center gap-2 px-4 py-2.5 text-xs text-white"
          style={{ background: site.tint }}
        >
          <Search className="size-3.5" />
          <span className="truncate">{query || "tank tops"}</span>
          <span className="ml-auto shrink-0 opacity-70">{products.length} results</span>
        </div>

        <div className={cn("grid gap-3 p-4", compact ? "grid-cols-3" : "grid-cols-3 sm:grid-cols-4")}>
          {products.map((product) => {
            const pinned = pinnedIds?.includes(product.id) ?? false;
            const over = budget != null && product.price > budget;
            const interactive = Boolean(onPin);
            return (
              <button
                key={product.id}
                type="button"
                disabled={!interactive || pinned}
                onClick={() => onPin?.(product)}
                className={cn(
                  "group/product relative text-left transition-transform",
                  interactive && !pinned ? "cursor-pointer hover:-translate-y-0.5" : "cursor-default",
                )}
              >
                <div
                  className="aspect-[3/4] w-full"
                  style={{ background: `linear-gradient(150deg, ${product.from}, ${product.to})` }}
                />
                {!compact ? (
                  <div className="py-1.5">
                    <p className="truncate text-xs">{product.name}</p>
                    <p
                      className={cn(
                        "text-xs",
                        over ? "text-zinc-400 line-through" : "font-medium text-zinc-900",
                      )}
                    >
                      ${product.price}
                    </p>
                  </div>
                ) : null}

                {/* Pinning is a click on the product — no pasting links. */}
                {interactive ? (
                  <span
                    className={cn(
                      "absolute right-1.5 top-1.5 flex size-7 items-center justify-center text-xs font-semibold shadow-sm transition-opacity",
                      pinned
                        ? "bg-live text-live-foreground"
                        : "bg-white/90 text-zinc-900 opacity-0 group-hover/product:opacity-100",
                    )}
                  >
                    {pinned ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Stand-in for the host's camera. Deliberately not `getUserMedia` — the
 * prototype should run the same way in a screen recording, on any machine, with
 * no permission prompt interrupting the flow being tested.
 */
export function CameraTile({ camOn, className }: { camOn: boolean; className?: string }) {
  return (
    <div className={cn("relative overflow-hidden bg-zinc-900", className)}>
      {camOn ? (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_0%,#4b5563_0%,#18181b_70%)]" />
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
            <span className="size-[38%] translate-y-[18%] rounded-full bg-white/25" />
            <span className="h-[38%] w-[78%] rounded-t-[999px] bg-white/25" />
          </div>
        </>
      ) : (
        <div className="flex h-full w-full items-center justify-center text-white/40">
          <VideoOff className="size-5" />
        </div>
      )}
    </div>
  );
}

export function LivePill({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 bg-live px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-live-foreground",
        className,
      )}
    >
      <span className="size-1.5 animate-pulse rounded-full bg-live-foreground/80" />
      Live
    </span>
  );
}

/** Pulls a budget out of the hunt ("under $40") so the grid can grey out misses. */
export function parseBudget(mission: string): number | null {
  const match = mission.match(/\$\s?(\d+)/);
  return match ? Number(match[1]) : null;
}
