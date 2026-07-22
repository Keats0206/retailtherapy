"use client";

import { useState } from "react";
import { ChevronUp, MessageSquare } from "lucide-react";

import { ShoppingTrail } from "@/components/shopping-trail";
import { StudioControls } from "@/components/studio-controls";
import { buttonVariants } from "@/components/ui/button";
import type { StreamState } from "@/lib/stream-store";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The host's studio while live. Presenting isn't watching yourself: the video is
 * demoted to a narrow confidence monitor on the left — small camera, small
 * preview of what's being shared — and the shopping tools and chat get the room.
 *
 * The video and chat arrive as slots rather than being rendered here, because
 * they're the only LiveKit-bound parts. `/host` passes the real confidence
 * monitor and data-channel chat; `/prototype` passes placeholders and an
 * in-memory log, and gets the same studio.
 */
export function StudioLayout({
  stream,
  monitor,
  chat,
  channel3Configured = true,
  onResolveProduct,
}: {
  stream: StreamState;
  monitor: React.ReactNode;
  chat: React.ReactNode;
  /** When false, product pinning is disabled until CHANNEL3_API_KEY is set. */
  channel3Configured?: boolean;
  /** Overrides the Channel3 lookup — see `StudioControls`. */
  onResolveProduct?: (url: string) => Promise<Product>;
}) {
  const { pinned, trail, pin, unpin, setNote, votesFor } = stream;
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  return (
    <div className="flex min-h-0 flex-1 flex-col-reverse lg:flex-row">
      {monitor}

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 max-lg:gap-3 max-lg:p-3 xl:flex-row xl:overflow-hidden">
        <div className="flex min-w-0 flex-col gap-4 max-lg:gap-3 xl:flex-1 xl:overflow-y-auto">
          <StudioControls
            pinned={pinned}
            votes={pinned ? votesFor(pinned.id) : undefined}
            onPin={pin}
            onUnpin={unpin}
            onNote={setNote}
            onResolve={onResolveProduct}
            channel3Configured={channel3Configured}
          />
          <ShoppingTrail
            products={trail}
            pinnedId={pinned?.id ?? null}
            onSelect={pin}
            votesFor={votesFor}
            size="compact"
          />
        </div>

        <div
          className={cn(
            "flex shrink-0 flex-col overflow-hidden transition-[max-height] duration-200 xl:min-h-64 xl:w-80 xl:flex-none",
            "max-xl:rounded-xl max-xl:bg-card max-xl:ring-1 max-xl:ring-foreground/10",
            mobileChatOpen
              ? "max-h-[min(75vh,28rem)] xl:max-h-none"
              : "max-h-11 xl:max-h-none",
          )}
        >
          <button
            type="button"
            onClick={() => setMobileChatOpen((open) => !open)}
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "h-11 w-full shrink-0 justify-between rounded-none px-4 hover:bg-transparent xl:hidden",
            )}
          >
            <span className="inline-flex items-center gap-2">
              <MessageSquare className="size-4" />
              Live chat
            </span>
            <ChevronUp
              className={cn(
                "size-4 text-muted-foreground transition-transform",
                mobileChatOpen && "rotate-180",
              )}
            />
          </button>
          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col overflow-hidden",
              !mobileChatOpen && "max-xl:hidden",
              mobileChatOpen &&
                "max-xl:[&_[data-slot=panel-header]]:hidden max-xl:[&_[data-slot=panel]]:rounded-none max-xl:[&_[data-slot=panel]]:py-0 max-xl:[&_[data-slot=panel]]:ring-0",
            )}
          >
            {chat}
          </div>
        </div>
      </div>
    </div>
  );
}
