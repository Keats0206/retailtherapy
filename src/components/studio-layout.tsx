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
 * The host's studio while live. Screen share fills the main stage (Meet-style),
 * with shopping tools and chat in a narrow rail on the right.
 *
 * The stage and chat arrive as slots rather than being rendered here, because
 * they're the LiveKit-bound parts. `/host` passes the real stage and
 * data-channel chat.
 */
export function StudioLayout({
  stream,
  stage,
  chat,
  channel3Configured = true,
  onResolveProduct,
}: {
  stream: StreamState;
  stage: React.ReactNode;
  chat: React.ReactNode;
  /** When false, product pinning is disabled until CHANNEL3_API_KEY is set. */
  channel3Configured?: boolean;
  /** Overrides the Channel3 lookup — see `StudioControls`. */
  onResolveProduct?: (url: string) => Promise<Product>;
}) {
  const { pinned, verse, trail, pin, unpin, endInteraction, setNote, votesFor, verseVotesFor, startVerse } = stream;
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      {stage}

      <aside className="flex min-h-0 w-full flex-col gap-4 overflow-y-auto border-border p-4 max-lg:gap-3 max-lg:p-3 max-lg:flex-1 lg:w-90 lg:shrink-0 lg:border-l lg:overflow-hidden">
        <div className="flex min-h-0 flex-col gap-4 max-lg:gap-3 lg:flex-1 lg:overflow-y-auto">
          <StudioControls
            pinned={pinned}
            verse={verse}
            votes={pinned ? votesFor(pinned.id) : undefined}
            verseVotes={verse ? verseVotesFor(verse.id) : undefined}
            onPin={pin}
            onUnpin={unpin}
            onEndInteraction={endInteraction}
            onStartVerse={startVerse}
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
            "flex min-h-0 shrink-0 flex-col overflow-hidden transition-[max-height] duration-200 lg:min-h-48 lg:flex-1",
            "max-lg:rounded-xl max-lg:bg-card max-lg:ring-1 max-lg:ring-foreground/10",
            mobileChatOpen
              ? "max-h-[min(75vh,28rem)] lg:max-h-none"
              : "max-h-11 lg:max-h-none",
          )}
        >
          <button
            type="button"
            onClick={() => setMobileChatOpen((open) => !open)}
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "h-11 w-full shrink-0 justify-between rounded-none px-4 hover:bg-transparent lg:hidden",
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
              !mobileChatOpen && "max-lg:hidden",
              mobileChatOpen &&
                "max-lg:[&_[data-slot=panel-header]]:hidden max-lg:[&_[data-slot=panel]]:rounded-none max-lg:[&_[data-slot=panel]]:py-0 max-lg:[&_[data-slot=panel]]:ring-0",
            )}
          >
            {chat}
          </div>
        </div>
      </aside>
    </div>
  );
}
