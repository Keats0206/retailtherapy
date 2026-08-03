"use client";

import { HostPinBar } from "@/components/host-pin-bar";
import { ShoppingTrail } from "@/components/shopping-trail";
import type { StreamState } from "@/lib/stream-store";
import { cn } from "@/lib/utils";

/**
 * Host cart: paste a link to add + pin, tap any item to put it back on screen.
 */
export function HostCart({
  stream,
  variant = "rail",
  className,
}: {
  stream: StreamState;
  variant?: "rail" | "pip";
  className?: string;
}) {
  const { pinned, trail, pin, unpin, votesFor, votersFor } = stream;

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden", className)}>
      <HostPinBar
        pinned={pinned}
        onPin={pin}
        onUnpin={unpin}
        variant={variant}
        className="shrink-0"
      />
      <ShoppingTrail
        products={trail}
        pinnedId={pinned?.id ?? null}
        onSelect={pin}
        votesFor={votesFor}
        votersFor={votersFor}
        size="comfortable"
        variant={variant === "pip" ? "pip" : "rail"}
        hostCart
        className="min-h-0 flex-1 overflow-y-auto"
      />
    </div>
  );
}
