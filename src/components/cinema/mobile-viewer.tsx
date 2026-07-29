"use client";

import { useState } from "react";
import { Bookmark, History, MessageCircle, ShoppingBag } from "lucide-react";

import {
  ChatComposer,
  ChatFeed,
  type ChatMessage,
} from "@/components/cinema/chat-panel";
import { Button } from "@/components/ui/button";
import {
  PROTOTYPE_CATALOG,
  type PrototypeProduct,
} from "@/lib/cinema/prototype-catalog";
import { cn } from "@/lib/utils";

type Tab = "chat" | "cart" | "saved";

export type RecentItem = { key: string; productId: string; at: number };

/**
 * The viewer experience at phone size.
 *
 * The stream keeps normal player dimensions at the top — the shape people already
 * expect from a mobile video app — and everything shoppable lives below it behind
 * tabs, because on a phone those compete for the same space and the video wins.
 * Auto-zoom is what makes the split viable: a full desktop capture at player size
 * on a phone is unreadable without it.
 */
export function MobileViewer({
  stage,
  savedProducts,
  onUnsave,
  onSave,
  recent,
  hostCart,
  chat,
}: {
  stage: React.ReactNode;
  savedProducts: PrototypeProduct[];
  onUnsave: (id: string) => void;
  onSave: (id: string) => void;
  recent: RecentItem[];
  /** What the host has put in their own cart — viewers watch it fill up live. */
  hostCart: PrototypeProduct[];
  chat: {
    messages: ChatMessage[];
    draft: string;
    setDraft: (next: string) => void;
    send: () => void;
  };
}) {
  const [tab, setTab] = useState<Tab>("chat");

  const tabs: ReadonlyArray<readonly [Tab, string, React.ReactNode, number]> = [
    ["chat", "Chat", <MessageCircle key="c" className="size-3.5" />, 0],
    ["cart", "Her cart", <ShoppingBag key="b" className="size-3.5" />, hostCart.length],
    ["saved", "Saved", <Bookmark key="s" className="size-3.5" />, savedProducts.length],
  ];

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-full max-w-[340px]">
        <div className="rounded-[2.75rem] bg-black p-2.5 shadow-2xl ring-1 ring-foreground/12">
          {/* A real phone is ~9:19.5 — pin the shell to it so the layout says
              something honest about thumb reach. */}
          <div
            className="relative flex flex-col overflow-hidden rounded-[2.25rem] bg-black"
            style={{ aspectRatio: "9 / 19.5" }}
          >
            <div className="flex shrink-0 items-center justify-between px-5 pb-1 pt-2.5 text-[10px] font-medium text-white/70">
              <span>9:41</span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-flex size-1.5 animate-pulse rounded-full bg-live" />
                LIVE
              </span>
            </div>

            {/* Player-sized, not half the screen. */}
            <div className="shrink-0">{stage}</div>

            <div className="flex shrink-0 items-center gap-1 px-3 pb-2 pt-2.5">
              {tabs.map(([value, label, icon, count]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTab(value)}
                  aria-pressed={tab === value}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-1.5 text-[11px] font-medium transition-colors",
                    tab === value
                      ? "bg-white/15 text-white"
                      : "text-white/45 hover:text-white/70",
                  )}
                >
                  {icon}
                  {label}
                  {count > 0 ? (
                    <span className="rounded-full bg-live px-1.5 text-[10px] text-live-foreground">
                      {count}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>

            <div className="flex min-h-0 flex-1 flex-col px-4 pb-2">
              {tab === "chat" ? (
                <ChatFeed messages={chat.messages} tone="dark" className="flex-1" />
              ) : (
                <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
                  {tab === "cart" ? (
                    hostCart.length === 0 ? (
                      <EmptyNote>
                        Nothing in her cart yet. When she adds something while
                        browsing, it lands here live.
                      </EmptyNote>
                    ) : (
                      hostCart.map((product) => (
                        <ProductRow
                          key={product.id}
                          product={product}
                          action="Add to mine"
                          onAction={() => onSave(product.id)}
                        />
                      ))
                    )
                  ) : savedProducts.length === 0 ? (
                    <EmptyNote>
                      Tap a marker on the stream to save it here without leaving the
                      show.
                    </EmptyNote>
                  ) : (
                    savedProducts.map((product) => (
                      <ProductRow
                        key={product.id}
                        product={product}
                        action="Remove"
                        onAction={() => onUnsave(product.id)}
                      />
                    ))
                  )}
                </div>
              )}

              {tab === "chat" && recent.length > 0 ? (
                <div className="shrink-0 pt-2">
                  <span className="mb-1.5 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-white/40">
                    <History className="size-3" /> Went past too fast
                  </span>
                  <div className="-mx-4 flex gap-2 overflow-x-auto px-4">
                    {recent.map((item) => {
                      const product = PROTOTYPE_CATALOG.find(
                        (p) => p.id === item.productId,
                      );
                      if (!product) return null;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => onSave(product.id)}
                          className="flex shrink-0 flex-col items-start rounded-lg bg-white/10 px-2.5 py-1.5 text-left hover:bg-white/15"
                        >
                          <span className="max-w-[14ch] truncate text-[11px] text-white">
                            {product.name}
                          </span>
                          <span className="text-[10px] text-white/50">
                            {product.price}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            <ChatComposer
              draft={chat.draft}
              setDraft={chat.setDraft}
              send={chat.send}
              tone="dark"
              className="shrink-0 px-3 pb-1.5 pt-1"
            />

            <div className="flex shrink-0 justify-center pb-2 pt-1">
              <span className="h-1 w-28 rounded-full bg-white/25" />
            </div>
          </div>
        </div>
      </div>

      <p className="max-w-md text-center text-xs leading-relaxed text-muted-foreground">
        Player up top, everything shoppable below behind tabs. Tap a marker on the
        stream to save it, or copy something out of the host&rsquo;s cart.
      </p>
    </div>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl bg-white/5 p-3 text-[11px] leading-relaxed text-white/50">
      {children}
    </p>
  );
}

function ProductRow({
  product,
  action,
  onAction,
}: {
  product: PrototypeProduct;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-2">
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-[12px] text-white">{product.name}</span>
        <span className="text-[10px] text-white/50">
          {product.brand} · {product.price}
        </span>
      </div>
      <Button
        size="micro"
        variant="ghost"
        onClick={onAction}
        className="shrink-0 text-[10px] text-white hover:bg-white/10"
      >
        {action}
      </Button>
    </div>
  );
}
