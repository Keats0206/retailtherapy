"use client";

import { useState } from "react";
import { MessageSquare, ShoppingCart, Sparkles, Square } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { ChatPanel } from "@/components/chat-panel";
import { HostCart } from "@/components/host-cart";
import { Button } from "@/components/ui/button";
import {
  StudioControls,
  type HostPollControls,
} from "@/components/studio-controls";
import { useViewerJoins } from "@/hooks/use-viewer-joins";
import type { StreamState } from "@/lib/stream-store";
import { cn } from "@/lib/utils";

type StudioTab = "chat" | "cart" | "interactions";

const STUDIO_TABS: { id: StudioTab; label: string; icon: typeof MessageSquare }[] = [
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "cart", label: "Cart", icon: ShoppingCart },
  { id: "interactions", label: "Interactions", icon: Sparkles },
];

function HostStudioChat({
  variant,
  onOpenInteractions,
}: {
  variant: "rail" | "pip";
  onOpenInteractions?: () => void;
}) {
  const joins = useViewerJoins();
  return (
    <ChatPanel
      variant={variant === "pip" ? "pip" : "rail"}
      className="min-h-0 flex-1"
      extraLines={joins}
      onOpenInteractions={onOpenInteractions}
    />
  );
}

export function StudioRail({
  stream,
  poll,
  chat,
  chatCount = 0,
  variant = "rail",
  className,
  setup,
  onEndShow,
}: {
  stream: StreamState;
  poll?: HostPollControls;
  chat?: React.ReactNode;
  chatCount?: number;
  variant?: "rail" | "pip";
  className?: string;
  /** Pre-share checklist — sits above the tabs until the host is fully set up. */
  setup?: React.ReactNode;
  onEndShow?: () => void;
}) {
  const { verse, trail, endInteraction, verseVotesFor } = stream;
  const [tab, setTab] = useState<StudioTab>("chat");
  const isPip = variant === "pip";

  const chatPanel =
    chat ?? (
      <HostStudioChat
        variant={isPip ? "pip" : "rail"}
        onOpenInteractions={poll ? () => setTab("interactions") : undefined}
      />
    );

  const controls = (
    <StudioControls
      verse={verse}
      verseVotes={verse ? verseVotesFor(verse.id) : undefined}
      poll={poll}
      onEndInteraction={endInteraction}
      variant={variant}
    />
  );

  const activeInteractionCount = (poll?.poll ? 1 : 0) + (verse ? 1 : 0);
  const tabIndicatorId = isPip ? "pip-tab-indicator" : "rail-tab-indicator";

  return (
    <aside
      className={cn(
        isPip
          ? "flex min-h-0 flex-1 flex-col overflow-hidden"
          : "studio-rail flex min-h-0 w-full shrink-0 flex-col lg:h-full lg:w-80 xl:w-96",
        className,
      )}
    >
      {setup ? (
        <div className="shrink-0 border-b border-border/60 px-4 py-3">
          {setup}
        </div>
      ) : null}

      <nav
        className="pip-studio-tabs flex shrink-0 border-b border-border/60"
        aria-label="Studio panels"
      >
        {STUDIO_TABS.map(({ id, label, icon: Icon }) => {
          const count =
            id === "cart"
              ? trail.length
              : id === "chat"
                ? chatCount
                : id === "interactions"
                  ? activeInteractionCount
                  : 0;
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex flex-1 items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors",
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground/80",
              )}
            >
              <Icon className="size-3.5 shrink-0" />
              <span>{label}</span>
              {count > 0 ? (
                <span
                  className={cn(
                    "min-w-5 rounded-full px-1.5 py-0.5 text-center text-xs font-semibold tabular-nums leading-none",
                    active
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {count}
                </span>
              ) : null}
              {active ? (
                <motion.span
                  layoutId={tabIndicatorId}
                  className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-live"
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                />
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            {tab === "chat" ? (
              chatPanel
            ) : tab === "cart" ? (
              <HostCart stream={stream} variant={isPip ? "pip" : "rail"} />
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto">{controls}</div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {onEndShow ? (
        <div className="shrink-0 border-t border-border/60 p-3">
          <Button
            type="button"
            variant="outline"
            onClick={onEndShow}
            className="w-full gap-1.5 border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground"
            aria-label="Exit show"
          >
            <Square className="size-3.5 fill-current" />
            Exit show
          </Button>
        </div>
      ) : null}
    </aside>
  );
}

/**
 * The host's studio while live. Screen share fills the stage; tabbed rail on the right.
 */
export function StudioLayout({
  stream,
  poll,
  stage,
  chatCount = 0,
  setup,
  onEndShow,
}: {
  stream: StreamState;
  poll?: HostPollControls;
  stage: React.ReactNode;
  chatCount?: number;
  setup?: React.ReactNode;
  onEndShow?: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col lg:h-full lg:flex-row">
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        {stage}
      </div>

      <StudioRail
        stream={stream}
        poll={poll}
        chatCount={chatCount}
        variant="rail"
        setup={setup}
        onEndShow={onEndShow}
      />
    </div>
  );
}
