"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@livekit/components-react";

import { Button, Input } from "@/components/ui";
import { cn } from "@/lib/utils";

/**
 * Live chat, backed by LiveKit's built-in chat (which rides the room's data
 * channel). Requires `canPublishData` on the token — see lib/livekit.ts.
 *
 * Messages are ephemeral: they exist only for participants connected at the
 * time. Late joiners start with an empty log.
 */
export function ChatPanel({ className }: { className?: string }) {
  const { chatMessages, send, isSending } = useChat();
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages.length]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isSending) return;
    setText("");
    try {
      await send(trimmed);
    } catch {
      setText(trimmed); // Put it back so the message isn't silently lost.
    }
  }

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col rounded-xl border border-zinc-200 dark:border-zinc-800",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
        <span className="text-sm font-semibold">Live chat</span>
        <span className="text-xs text-zinc-500">
          {chatMessages.length} {chatMessages.length === 1 ? "message" : "messages"}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-2 p-3">
          {chatMessages.length === 0 && (
            <p className="py-6 text-center text-sm text-zinc-500">
              No messages yet — say hi or drop a product link.
            </p>
          )}
          {chatMessages.map((m) => (
            <div key={m.id ?? m.timestamp} className="text-sm leading-snug">
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {m.from?.name || m.from?.identity || "Viewer"}
              </span>{" "}
              <span className="text-zinc-700 dark:text-zinc-300">
                {linkify(m.message)}
              </span>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      <form
        onSubmit={submit}
        className="flex gap-2 border-t border-zinc-200 p-3 dark:border-zinc-800"
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message or paste a link…"
          aria-label="Chat message"
        />
        <Button type="submit" size="sm" disabled={isSending || !text.trim()}>
          Send
        </Button>
      </form>
    </div>
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
        className="text-blue-600 underline underline-offset-2 dark:text-blue-400"
      >
        {part.length > 32 ? `${part.slice(0, 32)}…` : part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}
