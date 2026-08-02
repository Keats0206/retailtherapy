"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ConnectionState } from "livekit-client";

import { useConnectionState, useDataChannel } from "@/lib/live";

/**
 * Chat history replay over the LiveKit data channel.
 *
 * LiveKit's built-in `useChat()` only delivers messages sent while connected.
 * The host accumulates chat in `useChat()` and replays it to late joiners via
 * hello/snapshot — same pattern as shopping trail and poll state.
 */

export interface ChatLine {
  id?: string;
  timestamp: number;
  message: string;
  from?: { name?: string; identity?: string };
  /**
   * Room events ("someone joined") rendered inline with chat rather than in a
   * separate ticker — an empty room filling up should read as one feed. Never
   * sent over the wire; the host's rail synthesizes these locally.
   */
  kind?: "system";
}

const TOPIC = "chat";
const MAX_SNAPSHOT_MESSAGES = 200;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

type ChatEvent =
  | { t: "chatHello" }
  | { t: "chatSnapshot"; messages: ChatLine[] };

function capMessages(messages: ChatLine[]): ChatLine[] {
  if (messages.length <= MAX_SNAPSHOT_MESSAGES) return messages;
  return messages.slice(-MAX_SNAPSHOT_MESSAGES);
}

export function mergeChatMessages(
  history: ChatLine[],
  live: ChatLine[],
): ChatLine[] {
  const seen = new Set<string>();
  const merged: ChatLine[] = [];

  for (const message of [...history, ...live]) {
    const key =
      message.id ??
      `${message.timestamp}-${message.from?.identity ?? ""}-${message.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(message);
  }

  return merged.sort((a, b) => a.timestamp - b.timestamp);
}

export function useChatHistory({
  isHost,
  messages,
}: {
  isHost: boolean;
  messages: ChatLine[];
}): ChatLine[] {
  const [history, setHistory] = useState<ChatLine[]>([]);
  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const sendRef = useRef<((event: ChatEvent) => void) | null>(null);

  const handleMessage = useCallback(
    (raw: { payload: Uint8Array }) => {
      let event: ChatEvent;
      try {
        event = JSON.parse(decoder.decode(raw.payload)) as ChatEvent;
      } catch {
        return;
      }

      if (isHost) {
        if (event.t === "chatHello") {
          sendRef.current?.({
            t: "chatSnapshot",
            messages: capMessages(messagesRef.current),
          });
        }
        return;
      }

      if (event.t === "chatSnapshot") {
        setHistory(capMessages(event.messages));
      }
    },
    [isHost],
  );

  const { send } = useDataChannel(TOPIC, handleMessage);
  const connectionState = useConnectionState();
  const connected = connectionState === ConnectionState.Connected;

  useEffect(() => {
    if (!connected) {
      sendRef.current = null;
      return;
    }
    sendRef.current = (event: ChatEvent) => {
      send(encoder.encode(JSON.stringify(event)), { reliable: true }).catch(
        () => {},
      );
    };
    return () => {
      sendRef.current = null;
    };
  }, [send, connected]);

  useEffect(() => {
    if (isHost || !connected) return;
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      sendRef.current?.({ t: "chatHello" });
      if (attempts >= 3) clearInterval(timer);
    }, 700);
    return () => clearInterval(timer);
  }, [isHost, connected]);

  return isHost ? [] : history;
}
