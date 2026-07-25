"use client";

import { useEffect, useRef, useState } from "react";
import { useChat, useLocalParticipant } from "@livekit/components-react";
import { MessageSquare, SendHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Panel,
  PanelAction,
  PanelContent,
  PanelHeader,
  PanelTitle,
} from "@/components/ui/panel";
import {
  mergeChatMessages,
  useChatHistory,
  type ChatLine,
} from "@/lib/chat-state";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

export type { ChatLine };

export function ChatPanel({
  className,
  variant = "panel",
}: {
  className?: string;
  variant?: "panel" | "rail" | "pip";
}) {
  const { chatMessages, send, isSending } = useChat();
  const { localParticipant } = useLocalParticipant();
  const isHost = localParticipant.permissions?.canPublish ?? false;
  const history = useChatHistory({
    isHost,
    messages: isHost ? chatMessages : [],
  });
  const messages = isHost
    ? chatMessages
    : mergeChatMessages(history, chatMessages);

  return (
    <ChatPanelView
      messages={messages}
      onSend={send}
      isSending={isSending}
      className={className}
      variant={variant}
    />
  );
}

export function ChatPanelView({
  messages,
  onSend,
  isSending = false,
  className,
  variant = "panel",
}: {
  messages: ChatLine[];
  onSend: (message: string) => void | Promise<unknown>;
  isSending?: boolean;
  className?: string;
  variant?: "panel" | "rail" | "pip";
}) {
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const isRail = variant === "rail" || variant === "pip";
  const isPip = variant === "pip";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isSending) return;
    setText("");
    try {
      await onSend(trimmed);
      trackEvent(AnalyticsEvent.CHAT_MESSAGE_SENT, { area: "watch" });
    } catch {
      setText(trimmed);
    }
  }

  if (isRail) {
    return (
      <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
        <div className={cn("min-h-0 flex-1 overflow-y-auto", isPip ? "px-3 py-2" : "px-4 py-3")}>
          {messages.length === 0 ? (
            <div className={cn(
              "flex flex-col items-center justify-center gap-2 text-center",
              isPip ? "py-8" : "gap-3 py-12",
            )}>
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <MessageSquare className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  No messages yet
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Say hi or drop a product link.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {messages.map((m) => (
                <div key={m.id ?? m.timestamp} className="group">
                  <p className="text-xs font-semibold text-foreground">
                    {m.from?.name || m.from?.identity || "Viewer"}
                  </p>
                  <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                    {linkify(m.message)}
                  </p>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className={cn("shrink-0 border-t border-border/60", isPip ? "p-2" : "p-3")}>
          <form onSubmit={submit} className="flex items-center gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Message or paste a link…"
              aria-label="Chat message"
              className="h-10 flex-1"
            />
            <Button
              type="submit"
              size="icon"
              aria-label="Send message"
              className="size-10 shrink-0 bg-foreground text-background hover:bg-foreground/90"
              disabled={isSending || !text.trim()}
            >
              <SendHorizontal className="size-4" />
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <Panel className={cn("min-h-0 flex-1 gap-4", className)}>
      <PanelHeader className="px-4 pt-1">
        <PanelTitle>Live chat</PanelTitle>
        <PanelAction>
          <Badge variant="secondary" className="tabular-nums">
            {messages.length}
          </Badge>
        </PanelAction>
      </PanelHeader>

      <PanelContent className="min-h-0 flex-1 overflow-y-auto px-4">
        <div className="flex flex-col gap-2">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No messages yet — say hi or drop a product link.
            </p>
          )}
          {messages.map((m) => (
            <div key={m.id ?? m.timestamp} className="text-sm leading-snug">
              <span className="font-medium">
                {m.from?.name || m.from?.identity || "Viewer"}
              </span>{" "}
              <span className="text-muted-foreground">{linkify(m.message)}</span>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </PanelContent>

      <div className="px-4 pb-1">
        <form onSubmit={submit} className="flex w-full items-center gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Message or paste a link…"
            aria-label="Chat message"
          />
          <Button
            type="submit"
            size="icon"
            aria-label="Send message"
            className="shrink-0"
            disabled={isSending || !text.trim()}
          >
            <SendHorizontal />
          </Button>
        </form>
      </div>
    </Panel>
  );
}

function linkify(text: string): React.ReactNode {
  return text.split(/(https?:\/\/\S+)/g).map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-2"
      >
        {part.length > 32 ? `${part.slice(0, 32)}…` : part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}
