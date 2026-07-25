"use client";

import { useState } from "react";
import { MessageSquare, Plus, ShoppingBag } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { ChatPanel } from "@/components/chat-panel";
import { ShoppingTrail } from "@/components/shopping-trail";
import { StudioControls } from "@/components/studio-controls";
import { Badge } from "@/components/ui/badge";
import type { StreamState } from "@/lib/stream-store";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

type PipTab = "chat" | "trail";

const PIP_TABS: { id: PipTab; label: string; icon: typeof MessageSquare }[] = [
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "trail", label: "Trail", icon: ShoppingBag },
];

export function StudioRail({
  stream,
  chat,
  channel3Configured = true,
  onResolveProduct,
  chatCount = 0,
  variant = "rail",
  className,
}: {
  stream: StreamState;
  chat?: React.ReactNode;
  channel3Configured?: boolean;
  onResolveProduct?: (url: string) => Promise<Product>;
  chatCount?: number;
  variant?: "rail" | "pip";
  className?: string;
}) {
  const {
    pinned,
    verse,
    trail,
    pin,
    unpin,
    endInteraction,
    setNote,
    setFeatured,
    votesFor,
    votersFor,
    verseVotesFor,
    startVerse,
  } = stream;
  const [pipTab, setPipTab] = useState<PipTab>("chat");
  const isPip = variant === "pip";

  const chatPanel =
    chat ?? (
      <ChatPanel
        variant={isPip ? "pip" : "rail"}
        className="min-h-0 flex-1"
      />
    );

  const controls = (
    <StudioControls
      pinned={pinned}
      verse={verse}
      votes={pinned ? votesFor(pinned.id) : undefined}
      voters={pinned ? votersFor(pinned.id) : undefined}
      verseVotes={verse ? verseVotesFor(verse.id) : undefined}
      onPin={pin}
      onUnpin={unpin}
      onEndInteraction={endInteraction}
      onStartVerse={startVerse}
      onNote={setNote}
      onSetFeatured={setFeatured}
      onResolve={onResolveProduct}
      channel3Configured={channel3Configured}
      variant={variant}
    />
  );

  return (
    <aside
      className={cn(
        isPip
          ? "flex min-h-0 flex-1 flex-col overflow-hidden"
          : "studio-rail flex min-h-0 w-full shrink-0 flex-col lg:w-80 xl:w-96",
        className,
      )}
    >
      {isPip ? (
        <>
          <nav
            className="pip-studio-tabs flex shrink-0 border-b border-border/60"
            aria-label="Studio panels"
          >
            {PIP_TABS.map(({ id, label, icon: Icon }) => {
              const count =
                id === "trail"
                  ? trail.length
                  : id === "chat"
                    ? chatCount
                    : 0;
              const active = pipTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPipTab(id)}
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
                  {count > 0 && (
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
                  )}
                  {active && (
                    <motion.span
                      layoutId="pip-tab-indicator"
                      className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-live"
                      transition={{ type: "spring", stiffness: 500, damping: 40 }}
                    />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={pipTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="flex min-h-0 flex-1 flex-col overflow-hidden"
              >
                {pipTab === "chat" ? (
                  chatPanel
                ) : (
                  <>
                    <div className="max-h-[45%] shrink-0 overflow-y-auto border-b border-border/60">
                      {controls}
                    </div>
                    <ShoppingTrail
                      products={trail}
                      pinnedId={pinned?.id ?? null}
                      onSelect={pin}
                      votesFor={votesFor}
                      votersFor={votersFor}
                      size="comfortable"
                      variant="pip"
                      className="min-h-0 flex-1"
                    />
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </>
      ) : (
        <>
          <div className="flex min-h-0 flex-[3] flex-col overflow-hidden border-b border-border/60">
            <div className="flex shrink-0 items-center gap-1.5 border-b border-border/60 px-4 py-2.5">
              <Plus className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Add</span>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">{controls}</div>
          </div>

          <div className="flex min-h-0 flex-[2] flex-col overflow-hidden">
            <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-4 py-2.5">
              <div className="flex items-center gap-1.5">
                <MessageSquare className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Chat</span>
              </div>
              {chatCount > 0 && (
                <Badge variant="secondary" className="tabular-nums">
                  {chatCount}
                </Badge>
              )}
            </div>
            {chatPanel}
          </div>
        </>
      )}
    </aside>
  );
}

/**
 * The host's studio while live. Screen share fills the main stage with the
 * shopping trail below (like YouTube comments), and a control rail on the right.
 */
export function StudioLayout({
  stream,
  stage,
  chat,
  channel3Configured = true,
  onResolveProduct,
  chatCount = 0,
}: {
  stream: StreamState;
  stage: React.ReactNode;
  chat?: React.ReactNode;
  channel3Configured?: boolean;
  onResolveProduct?: (url: string) => Promise<Product>;
  chatCount?: number;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="relative min-h-0 flex-1">{stage}</div>

        <div className="flex min-h-0 max-h-72 shrink-0 flex-col border-t border-border bg-background lg:max-h-80">
          <ShoppingTrail
            products={stream.trail}
            pinnedId={stream.pinned?.id ?? null}
            onSelect={stream.pin}
            votesFor={stream.votesFor}
            votersFor={stream.votersFor}
            variant="feed"
            className="min-h-0 flex-1"
          />
        </div>
      </div>

      <StudioRail
        stream={stream}
        chat={chat}
        channel3Configured={channel3Configured}
        onResolveProduct={onResolveProduct}
        chatCount={chatCount}
        variant="rail"
      />
    </div>
  );
}
