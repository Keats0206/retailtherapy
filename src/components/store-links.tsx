"use client";

import { cn } from "@/lib/utils";

/**
 * Jump-off points for the host while they're screen sharing. Clicking one opens
 * the store in a new tab — which is exactly what the audience sees, since the
 * host shares a screen (or that tab) rather than a single window.
 *
 * These are plain storefront links, not affiliate links. Attribution happens on
 * the product level, when a pasted URL is resolved through Channel3 into a
 * trackable buy link (see /api/products/lookup).
 */
const STORES = [
  { name: "Amazon", url: "https://www.amazon.com" },
  { name: "Nordstrom", url: "https://www.nordstrom.com" },
  { name: "Sephora", url: "https://www.sephora.com" },
  { name: "SSENSE", url: "https://www.ssense.com" },
  { name: "Aritzia", url: "https://www.aritzia.com" },
  { name: "Uniqlo", url: "https://www.uniqlo.com/us/en/" },
  { name: "Target", url: "https://www.target.com" },
  { name: "REI", url: "https://www.rei.com" },
];

export function StoreLinks({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Jump to a store
      </span>
      <div className="flex flex-wrap gap-1.5">
        {STORES.map((store) => (
          <a
            key={store.name}
            href={store.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 transition-colors hover:border-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:bg-zinc-800"
          >
            {store.name} ↗
          </a>
        ))}
      </div>
    </div>
  );
}
