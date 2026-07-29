"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";

import { PROTOTYPE_CHAT_LINES } from "@/lib/cinema/prototype-catalog";
import { cn } from "@/lib/utils";

export type ChatMessage = {
  id: number;
  author: string;
  text: string;
  mine?: boolean;
};

/** Dark sits on the video/phone surface; light sits on the page. */
export type ChatTone = "dark" | "light";

/** How often canned chat traffic arrives, so the surface has some life. */
const CHAT_TICK_MS = 4200;

/**
 * Fake chat traffic for the prototype. Shared by the phone and web layouts so
 * the two views are demonstrably the same conversation, not two mock-ups that
 * drifted apart.
 */
export function useMockChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    PROTOTYPE_CHAT_LINES.slice(0, 5).map((line, i) => ({ id: i, ...line })),
  );
  const [draft, setDraft] = useState("");
  const nextId = useRef(PROTOTYPE_CHAT_LINES.length);

  useEffect(() => {
    const interval = setInterval(() => {
      const line =
        PROTOTYPE_CHAT_LINES[Math.floor(Math.random() * PROTOTYPE_CHAT_LINES.length)];
      setMessages((prev) => [...prev.slice(-40), { id: nextId.current++, ...line }]);
    }, CHAT_TICK_MS);
    return () => clearInterval(interval);
  }, []);

  const send = useCallback(() => {
    setDraft((current) => {
      const text = current.trim();
      if (!text) return current;
      setMessages((prev) => [
        ...prev,
        { id: nextId.current++, author: "you", text, mine: true },
      ]);
      return "";
    });
  }, []);

  return { messages, draft, setDraft, send };
}

export function ChatFeed({
  messages,
  tone = "light",
  className,
}: {
  messages: ChatMessage[];
  tone?: ChatTone;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  // Keep the newest message visible.
  useEffect(() => {
    const feed = ref.current;
    if (feed) feed.scrollTop = feed.scrollHeight;
  }, [messages]);

  return (
    <div ref={ref} className={cn("flex flex-col gap-2 overflow-y-auto", className)}>
      {messages.map((message) => (
        <div key={message.id} className="flex gap-2 text-[12px] leading-snug">
          <span
            className={cn(
              "shrink-0 font-semibold",
              message.mine
                ? "text-live-foreground"
                : tone === "dark"
                  ? "text-white/45"
                  : "text-muted-foreground",
            )}
          >
            {message.author}
          </span>
          <span
            className={cn("min-w-0", tone === "dark" ? "text-white/85" : "text-foreground")}
          >
            {message.text}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ChatComposer({
  draft,
  setDraft,
  send,
  tone = "light",
  placeholder = "Say something…",
  leading,
  className,
}: {
  draft: string;
  setDraft: (next: string) => void;
  send: () => void;
  tone?: ChatTone;
  placeholder?: string;
  /** Slot for an adjacent action, e.g. the pin button. */
  leading?: React.ReactNode;
  className?: string;
}) {
  const dark = tone === "dark";
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {leading}
      <div
        className={cn(
          "flex min-w-0 flex-1 items-center gap-1.5 rounded-full pl-3.5 pr-1",
          dark ? "bg-white/10" : "bg-muted/60 ring-1 ring-foreground/8",
        )}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              send();
            }
          }}
          placeholder={placeholder}
          className={cn(
            "min-w-0 flex-1 bg-transparent py-2 text-[12px] focus:outline-none",
            dark
              ? "text-white placeholder:text-white/35"
              : "text-foreground placeholder:text-muted-foreground",
          )}
        />
        <button
          type="button"
          onClick={send}
          disabled={draft.trim().length === 0}
          aria-label="Send"
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-full disabled:opacity-40",
            dark ? "bg-white/15 text-white" : "bg-foreground text-background",
          )}
        >
          <Send className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
