"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare } from "lucide-react";

import { ChatPanel } from "@/components/chat-panel";
import { ViewerCount } from "@/components/viewer-count";
import { useParticipants } from "@/lib/live";
import type { ChatLine } from "@/lib/chat-state";
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

const MAX_JOIN_LINES = 30;

/**
 * Arrivals, as chat lines. Identities come from LiveKit, but the design-mode
 * room has none — so an unnamed room falls back to counting the difference,
 * which is enough to make an empty rail visibly fill up.
 */
function useViewerJoins(): ChatLine[] {
  const participants = useParticipants();
  const [joins, setJoins] = useState<ChatLine[]>([]);
  const seen = useRef<Set<string>>(new Set());
  const anonCount = useRef(0);

  useEffect(() => {
    const viewers = participants.filter((p) => !p.permissions?.canPublish);
    const named = viewers.filter((p) => p.identity);
    const next: ChatLine[] = [];
    const at = Date.now();

    for (const viewer of named) {
      const identity = viewer.identity!;
      if (seen.current.has(identity)) continue;
      seen.current.add(identity);
      next.push({
        id: `join:${identity}`,
        timestamp: at,
        message: `${viewer.name || "Someone"} joined`,
        kind: "system",
      });
    }

    const anonymous = viewers.length - named.length;
    for (let i = anonCount.current; i < anonymous; i += 1) {
      next.push({
        id: `join:anon:${i}`,
        timestamp: at,
        message: "A viewer joined",
        kind: "system",
      });
    }
    anonCount.current = Math.max(anonymous, 0);

    if (next.length === 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setJoins((prev) => [...prev, ...next].slice(-MAX_JOIN_LINES));
  }, [participants]);

  return joins;
}
