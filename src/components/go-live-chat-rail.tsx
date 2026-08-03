"use client";

import { MessageSquare } from "lucide-react";

import { ChatPanel } from "@/components/chat-panel";
import { ViewerCount } from "@/components/viewer-count";
import { useViewerJoins } from "@/hooks/use-viewer-joins";
import { cn } from "@/lib/utils";

/**
 * The audience side of the go-live screen — the same rail before and after the
 * host goes live, so the layout never jumps underneath them. Offline it says
 * what will happen; live it fills with arrivals and messages.
 */
export function GoLiveChatRail({
  live,
  className,
}: {
  live: boolean;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        "flex min-h-0 flex-col border-border/60 bg-background",
        className,
      )}
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-1.5">
          <MessageSquare className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Live chat</span>
        </div>
        {live ? <ViewerCount className="text-muted-foreground" /> : null}
      </header>

      {live ? (
        <LiveChatFeed />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <MessageSquare className="size-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">
            Chat opens when you go live
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            You&apos;ll see people arrive here as they open your link.
          </p>
        </div>
      )}
    </aside>
  );
}

function LiveChatFeed() {
  const joins = useViewerJoins();
  return <ChatPanel variant="rail" className="min-h-0 flex-1" extraLines={joins} />;
}
