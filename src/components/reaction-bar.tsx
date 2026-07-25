"use client";

import { cn } from "@/lib/utils";
import {
  REACTION_EMOJIS,
  type ReactionBurst,
  type ReactionEmoji,
} from "@/lib/reaction-state";

/** Viewer tap bar — sends emoji reactions to the host over LiveKit. */
export function ReactionBar({
  onReact,
  className,
}: {
  onReact: (emoji: ReactionEmoji) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "pointer-events-auto flex items-center gap-1 rounded-full border border-white/20 bg-black/50 px-1.5 py-1 backdrop-blur-sm",
        className,
      )}
    >
      {REACTION_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          aria-label={`React ${emoji}`}
          onClick={() => onReact(emoji)}
          className="flex size-8 items-center justify-center rounded-full text-base transition-transform hover:scale-110 hover:bg-white/10 active:scale-95"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

/** Host stage overlay — floating reactions from the audience. */
export function ReactionOverlay({
  bursts,
  className,
}: {
  bursts: ReactionBurst[];
  className?: string;
}) {
  if (bursts.length === 0) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-16 z-10 flex flex-col items-end gap-1.5 px-3",
        className,
      )}
    >
      {bursts.slice(-6).map((burst, i) => (
        <div
          key={burst.id}
          className="animate-in fade-in-0 slide-in-from-right-4 flex items-center gap-1.5 rounded-full border border-white/15 bg-black/55 px-2.5 py-1 text-white shadow-lg backdrop-blur-md duration-300"
          style={{ animationDelay: `${i * 40}ms` }}
        >
          <span className="text-lg leading-none">{burst.emoji}</span>
          <span className="max-w-[8rem] truncate text-xs text-white/80">
            {burst.displayName}
          </span>
        </div>
      ))}
    </div>
  );
}
