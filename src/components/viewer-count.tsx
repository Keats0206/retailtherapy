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

  return <ViewerCountView count={viewers} className={className} />;
}

/**
 * The count display with no room attached — for callers that already have a
 * viewer total.
 */
export function ViewerCountView({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  return (
    <span className={cn("micro inline-flex items-center gap-2", className)}>
      {/* Same red as the live indicator — one accent, one meaning. */}
      <span className="h-1 w-1 rounded-full bg-live" />
      {formatCount(count)} watching
    </span>
  );
}
