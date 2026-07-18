"use client";

import { useParticipants } from "@livekit/components-react";

import { formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Live viewer count. Everyone in the room is a viewer except the publishing
 * host, so we subtract participants who can publish media.
 */
export function ViewerCount({ className }: { className?: string }) {
  const participants = useParticipants();
  const viewers = participants.filter(
    (p) => !p.permissions?.canPublish,
  ).length;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      {formatCount(viewers)} watching
    </span>
  );
}
