"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { formatClock } from "@/lib/format";
import type { ChatMessage, Creator, Product, Session } from "@/lib/types";
import { sendChat } from "@/lib/store";
import { startCameraPreview, stopStream } from "@/lib/services/video";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface VideoStageProps {
  creator: Creator;
  session: Session;
  currentProduct: Product | null;
  /** Studio passes true to attempt a real local camera preview in the PiP. */
  enableCameraPreview?: boolean;
  /** Real screen-share stream to display in the main stage (studio). */
  screenStream?: MediaStream | null;
  /** Provide chat to enable the Twitch-style overlay in fullscreen/theater mode. */
  messages?: ChatMessage[];
  /** Display name used when sending from the overlay chat input. */
  chatUser?: string;
  className?: string;
}

export function VideoStage({
  creator,
  session,
  currentProduct,
  enableCameraPreview,
  screenStream,
  messages,
  chatUser,
  className,
}: VideoStageProps) {
  const live = session.status === "live";
  const [elapsed, setElapsed] = useState(0);
  const [camOn, setCamOn] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [chatVisible, setChatVisible] = useState(true);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const camVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);

  // Elapsed timer
  useEffect(() => {
    if (!live || !session.startedAt) {
      setElapsed(0);
      return;
    }
    const tick = () => setElapsed(Date.now() - (session.startedAt ?? Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [live, session.startedAt]);

  // Camera PiP preview
  useEffect(() => {
    if (!enableCameraPreview || !live) return;
    let stream: MediaStream | null = null;
    let cancelled = false;
    startCameraPreview().then((s) => {
      if (cancelled || !s) return;
      stream = s;
      if (camVideoRef.current) {
        camVideoRef.current.srcObject = s;
        setCamOn(true);
      }
    });
    return () => {
      cancelled = true;
      stopStream(stream);
      setCamOn(false);
    };
  }, [enableCameraPreview, live]);

  // Attach screen-share stream
  useEffect(() => {
    if (screenVideoRef.current) {
      screenVideoRef.current.srcObject = screenStream ?? null;
    }
  }, [screenStream]);

  // Track native fullscreen changes (e.g. user presses Esc)
  useEffect(() => {
    const onChange = () =>
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  async function toggleFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {});
    } else {
      await containerRef.current?.requestFullscreen().catch(() => {});
    }
  }

  const showOverlayChat = isFullscreen && !!messages;

  return (
    <div
      ref={containerRef}
      className={cn(
        "group/stage relative w-full overflow-hidden rounded-xl border border-border bg-zinc-950",
        isFullscreen ? "h-screen rounded-none" : "aspect-video",
        className,
      )}
    >
      {/* Main stage: real screen share, or mock browser surface */}
      {screenStream ? (
        <div className="absolute inset-0 bg-black">
          <video
            ref={screenVideoRef}
            autoPlay
            muted
            playsInline
            className="h-full w-full object-contain"
          />
        </div>
      ) : (
        <div className="absolute inset-0 flex flex-col">
          <div className="flex items-center gap-1.5 border-b border-white/10 bg-white/5 px-3 py-2">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
            <div className="ml-2 flex-1 truncate rounded bg-black/40 px-2 py-1 text-[11px] text-white/60">
              {currentProduct ? currentProduct.url : "about:blank"}
            </div>
          </div>
          <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-zinc-900 to-black p-6 text-center">
            {live ? (
              currentProduct ? (
                <div className="flex items-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentProduct.imageUrl}
                    alt=""
                    className="h-28 w-28 rounded-lg object-cover ring-1 ring-white/10"
                  />
                  <div className="text-left">
                    <div className="text-xs uppercase tracking-wide text-white/40">
                      {currentProduct.retailer}
                    </div>
                    <div className="max-w-xs text-lg font-medium text-white">
                      {currentProduct.name}
                    </div>
                    <div className="text-white/60">Peter is viewing this now…</div>
                  </div>
                </div>
              ) : (
                <div className="text-white/50">
                  Screen share is live — browsing products…
                </div>
              )
            ) : (
              <div className="text-white/40">
                {session.status === "ended"
                  ? "Stream ended — watch the replay below"
                  : `${creator.name} is offline`}
              </div>
            )}
          </div>
        </div>
      )}

      {/* LIVE badge + timer */}
      {live && (
        <div className="absolute left-3 top-3 z-20 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded bg-rose-600 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-white">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
            Live
          </span>
          <span className="rounded bg-black/50 px-2 py-0.5 font-mono text-xs text-white/80">
            {formatClock(elapsed)}
          </span>
        </div>
      )}

      {/* Stage controls (top-right) */}
      <div className="absolute right-3 top-3 z-20 flex items-center gap-1.5 opacity-0 transition-opacity group-hover/stage:opacity-100 focus-within:opacity-100">
        {showOverlayChat && (
          <button
            type="button"
            onClick={() => setChatVisible((v) => !v)}
            className="rounded bg-black/50 px-2 py-1 text-xs text-white/90 backdrop-blur hover:bg-black/70"
          >
            {chatVisible ? "Hide chat" : "Show chat"}
          </button>
        )}
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          className="rounded bg-black/50 px-2 py-1 text-sm text-white/90 backdrop-blur hover:bg-black/70"
        >
          {isFullscreen ? "⇲ Exit" : "⛶ Fullscreen"}
        </button>
      </div>

      {/* Creator camera PiP */}
      <div className="absolute bottom-3 right-3 z-10 h-24 w-32 overflow-hidden rounded-lg border border-white/15 bg-zinc-900 shadow-lg">
        <video
          ref={camVideoRef}
          autoPlay
          muted
          playsInline
          className={cn("h-full w-full object-cover", !camOn && "hidden")}
        />
        {!camOn && (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={creator.avatarUrl}
              alt=""
              className="h-9 w-9 rounded-full object-cover"
            />
            <span className="text-[10px] text-white/50">
              {live ? "cam" : "offline"}
            </span>
          </div>
        )}
      </div>

      {/* Twitch-style chat overlay (fullscreen only) */}
      {showOverlayChat && chatVisible && (
        <ChatOverlay messages={messages!} user={chatUser} />
      )}
    </div>
  );
}

function ChatOverlay({
  messages,
  user,
}: {
  messages: ChatMessage[];
  user?: string;
}) {
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !user) return;
    sendChat(user, trimmed);
    setText("");
  }

  return (
    <div className="absolute bottom-3 left-3 top-14 z-10 flex w-80 max-w-[80vw] flex-col overflow-hidden rounded-lg">
      <div
        ref={scrollRef}
        className="flex flex-1 flex-col justify-end gap-1 overflow-y-auto bg-gradient-to-t from-black/70 via-black/40 to-transparent p-3"
      >
        {messages.slice(-40).map((m) => (
          <div
            key={m.id}
            className="text-sm leading-snug text-white drop-shadow [text-shadow:0_1px_2px_rgb(0_0_0)]"
          >
            <span
              className={cn(
                "font-semibold",
                m.isBot ? "text-white/70" : "text-primary",
              )}
            >
              {m.user}
            </span>{" "}
            <span>{m.text}</span>
          </div>
        ))}
      </div>
      {user && (
        <form onSubmit={submit} className="flex gap-2 bg-black/50 p-2 backdrop-blur">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Chat…"
            className="border-white/20 bg-black/40 text-white placeholder:text-white/50"
            aria-label="Chat message"
          />
          <Button type="submit" size="sm" disabled={!text.trim()}>
            Send
          </Button>
        </form>
      )}
    </div>
  );
}
