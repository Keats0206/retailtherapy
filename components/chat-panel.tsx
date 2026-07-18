"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/types";
import { sendChat } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatPanelProps {
  messages: ChatMessage[];
  /** Display name to post as. */
  user: string;
  disabled?: boolean;
  className?: string;
}

export function ChatPanel({ messages, user, disabled, className }: ChatPanelProps) {
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    sendChat(user, trimmed);
    setText("");
  }

  const isLink = /https?:\/\//.test(text);

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-sm font-semibold">Live chat</span>
        <span className="text-xs text-muted-foreground">{messages.length} messages</span>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-2 p-3">
          {messages.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No messages yet — say hi or drop a product link.
            </p>
          )}
          {messages.map((m) => (
            <div key={m.id} className="text-sm leading-snug">
              <span
                className={cn(
                  "font-medium",
                  m.isBot ? "text-muted-foreground" : "text-foreground",
                )}
              >
                {m.user}
              </span>{" "}
              <span className="text-foreground/90">{linkify(m.text)}</span>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <form onSubmit={submit} className="flex gap-2 border-t border-border p-3">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={disabled ? "Chat is offline" : "Message or paste a link…"}
          disabled={disabled}
          aria-label="Chat message"
        />
        <Button type="submit" size="sm" disabled={disabled || !text.trim()}>
          {isLink ? "Submit link" : "Send"}
        </Button>
      </form>
    </div>
  );
}

function linkify(text: string): React.ReactNode {
  const parts = text.split(/(https?:\/\/\S+)/g);
  return parts.map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-2"
      >
        {part.length > 32 ? part.slice(0, 32) + "…" : part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}
