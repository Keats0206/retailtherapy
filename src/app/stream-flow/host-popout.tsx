"use client";

import { useRef, useState } from "react";
import { Mic, MicOff, Square, Video, VideoOff } from "lucide-react";

import { cn } from "@/lib/utils";

import { type MockProduct } from "./mock";
import { CameraTile, LivePill } from "./pieces";

export type ChatLine = { id: number; author: string; text: string };

/**
 * The host's control window.
 *
 * Once you're sharing a *different* window, the frontrow tab is behind the
 * store — so controls have to leave the page and float on top. In production
 * this is a Document PiP window (`useDocumentPiP`); here it's a draggable panel
 * dressed as one, so the flow can be walked through in a single tab.
 *
 * It stays deliberately small: status, mic/cam, chat, and the two ways out.
 */
export function HostPopout({
  title,
  elapsed,
  viewers,
  chat,
  pinned,
  micOn,
  camOn,
  onToggleMic,
  onToggleCam,
  onStopSharing,
  onEndShow,
}: {
  title: string;
  elapsed: string;
  viewers: number;
  chat: ChatLine[];
  pinned: MockProduct[];
  micOn: boolean;
  camOn: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onStopSharing: () => void;
  onEndShow: () => void;
}) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [confirming, setConfirming] = useState(false);
  const drag = useRef<{ x: number; y: number } | null>(null);

  function onPointerDown(e: React.PointerEvent) {
    drag.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    setOffset({ x: e.clientX - drag.current.x, y: e.clientY - drag.current.y });
  }

  function onPointerUp() {
    drag.current = null;
  }

  return (
    <div
      className="absolute bottom-4 right-4 z-30 flex max-h-[min(90%,32rem)] w-72 flex-col border border-white/15 bg-zinc-950 text-white shadow-2xl"
      style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
    >
      {/* Title bar — the affordance that says "separate window, drag me". */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="flex shrink-0 cursor-grab items-center gap-2 border-b border-white/10 bg-zinc-900 px-3 py-2 active:cursor-grabbing"
      >
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-white/25" />
          <span className="size-2.5 rounded-full bg-white/25" />
          <span className="size-2.5 rounded-full bg-white/25" />
        </div>
        <span className="micro truncate text-white/60">frontrow controls</span>
        <span className="micro ml-auto shrink-0 text-white/30">Always on top</span>
      </div>

      <div className="flex shrink-0 items-center gap-3 border-b border-white/10 p-3">
        <CameraTile camOn={camOn} className="size-14 shrink-0" />
        <div className="flex min-w-0 flex-col gap-1">
          <LivePill className="self-start" />
          <p className="truncate text-xs text-white/85" title={title}>
            {title}
          </p>
          <p className="truncate text-xs text-white/50">
            {viewers} watching · {elapsed}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 gap-px bg-white/10">
        <PopoutToggle active={micOn} onClick={onToggleMic}>
          {micOn ? <Mic className="size-4" /> : <MicOff className="size-4" />}
          {micOn ? "Mic on" : "Muted"}
        </PopoutToggle>
        <PopoutToggle active={camOn} onClick={onToggleCam}>
          {camOn ? <Video className="size-4" /> : <VideoOff className="size-4" />}
          {camOn ? "Cam on" : "Cam off"}
        </PopoutToggle>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        <p className="micro text-white/40">
          Chat{pinned.length ? ` · ${pinned.length} pinned` : ""}
        </p>
        {chat.length ? (
          chat.slice(-14).map((line) => (
            <p key={line.id} className="text-xs leading-snug text-white/85">
              <span className="text-white/45">{line.author}</span> {line.text}
            </p>
          ))
        ) : (
          <p className="text-xs text-white/40">Quiet so far.</p>
        )}
      </div>

      {/* Square, full-width, stacked — the two ways out of a show. */}
      <div className="flex shrink-0 flex-col gap-px bg-white/10">
        {confirming ? (
          <>
            <p className="bg-zinc-950 px-3 py-2 text-xs text-white/60">
              End the show for everyone watching?
            </p>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="w-full bg-zinc-950 py-3 text-sm font-medium text-white hover:bg-zinc-900"
            >
              Keep going
            </button>
            <button
              type="button"
              onClick={onEndShow}
              className="w-full bg-destructive py-3 text-sm font-medium text-destructive-foreground hover:opacity-90"
            >
              Yes, end show
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={onStopSharing}
              className="w-full bg-zinc-950 py-3 text-sm font-medium text-white hover:bg-zinc-900"
            >
              Share a different window
            </button>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="flex w-full items-center justify-center gap-2 bg-destructive py-3 text-sm font-medium text-destructive-foreground hover:opacity-90"
            >
              <Square className="size-3.5 fill-current" />
              End show
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function PopoutToggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-medium",
        active
          ? "bg-zinc-950 text-white hover:bg-zinc-900"
          : "bg-white text-zinc-900 hover:bg-white/90",
      )}
    >
      {children}
    </button>
  );
}
