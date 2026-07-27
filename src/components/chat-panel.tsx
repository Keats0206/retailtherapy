"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@livekit/components-react";
import { SendHorizontal } from "lucide-react";

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
import { cn } from "@/lib/utils";

/**
 * One line of chat. Structurally what the markup reads off a LiveKit
 * `ReceivedChatMessage`, so the connector below can pass those straight
 * through — and the prototype can hand over plain objects.
 */
export interface ChatLine {
  id?: string;
  timestamp: number;
  message: string;
  from?: { name?: string; identity?: string };
}

/**
 * Live chat, backed by LiveKit's built-in chat (which rides the room's data
 * channel). Requires `canPublishData` on the token — see lib/livekit.ts.
 *
 * Messages are ephemeral: they exist only for participants connected at the
 * time. Late joiners start with an empty log.
 */
export function ChatPanel({ className }: { className?: string }) {
  const { chatMessages, send, isSending } = useChat();

  return (
    <ChatPanelView
      messages={chatMessages}
      onSend={send}
      isSending={isSending}
      className={className}
    />
  );
}

/**
 * The chat markup, with no room attached. Split out from `ChatPanel` so callers
 * can supply messages from any transport.
 */
export function ChatPanelView({
  messages,
  onSend,
  isSending = false,
  className,
}: {
  messages: ChatLine[];
  onSend: (message: string) => void | Promise<unknown>;
  isSending?: boolean;
  className?: string;
}) {
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const messageKey = useMemo(
    () =>
      messages
        .map((message) => message.id ?? message.timestamp)
        .join("\n"),
    [messages],
  );

  const renderedMessages = messages;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messageKey]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isSending) return;
    setText("");
    try {
      await onSend(trimmed);
    } catch {
      setText(trimmed); // Put it back so the message isn't silently lost.
    }
  }

  return (
    <Panel className={cn("min-h-0 flex-1 gap-4", className)}>
      <PanelHeader className="px-4 pt-1">
        <PanelTitle>Live chat</PanelTitle>
        <PanelAction>
          <Badge variant="secondary" className="tabular-nums">
            {renderedMessages.length}
          </Badge>
        </PanelAction>
      </PanelHeader>

      <PanelContent className="min-h-0 flex-1 overflow-y-auto px-4">
        {/* Deliberately plain lines rather than bubbles or avatars — the
            product imagery should be the only thing drawing the eye. */}
        <div className="flex flex-col gap-2">
          {renderedMessages.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No messages yet — say hi or drop a product link.
            </p>
          )}
          {renderedMessages.map((m) => (
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

/** Renders bare URLs in chat as clickable links. */
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
