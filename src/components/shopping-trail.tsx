"use client";

import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Every product pinned so far this stream. This is the thing that turns a
 * stream into a shoppable collection — it's what a replay page would render.
 */
export function ShoppingTrail({
  products,
  pinnedId,
  onSelect,
  className,
}: {
  products: Product[];
  pinnedId: string | null;
  /** Host-only: re-pin an earlier product. */
  onSelect?: (product: Product) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-zinc-200 p-3 dark:border-zinc-800",
        className,
      )}
    >
      <div className="flex items-center justify-between px-1 pb-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Shopping trail
        </span>
        <span className="text-xs text-zinc-500">{products.length} shown</span>
      </div>

      {products.length === 0 ? (
        <p className="px-1 py-4 text-sm text-zinc-500">
          Products the host pins will collect here.
        </p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {products.map((p) => {
            const active = p.id === pinnedId;
            const Wrapper = onSelect ? "button" : "div";
            return (
              <Wrapper
                key={p.id}
                {...(onSelect
                  ? { onClick: () => onSelect(p), type: "button" as const }
                  : {})}
                className={cn(
                  "w-32 shrink-0 rounded-lg border p-2 text-left transition-colors",
                  active
                    ? "border-zinc-900 dark:border-zinc-100"
                    : "border-zinc-200 dark:border-zinc-800",
                  onSelect && "hover:border-zinc-400 dark:hover:border-zinc-600",
                )}
              >
                {p.imageUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    className="mb-2 h-24 w-full rounded object-cover"
                  />
                )}
                <p className="truncate text-xs font-medium" title={p.name}>
                  {p.name}
                </p>
                <p className="text-xs text-zinc-500">
                  {formatPrice(p.price, p.currency)}
                </p>
              </Wrapper>
            );
          })}
        </div>
      )}
    </div>
  );
}
