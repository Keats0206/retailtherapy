"use client";

import { useMemo } from "react";

import { useParticipants } from "@/lib/live";

import { formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Live viewer count. Everyone in the room is a viewer except the publishing
 * host, so we subtract participants who can publish media.
 */
export function ViewerCount({ className }: { className?: string }) {
  const participants = useParticipants();
  const viewerCount = useMemo(() => {
    let count = 0;
    for (const participant of participants) {
      if (!participant.permissions?.canPublish) count += 1;
    }
    return count;
  }, [participants]);

  return <ViewerCountView count={viewerCount} className={className} />;
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
      <span className="h-1.5 w-1.5 rounded-full bg-live" />
      {formatCount(count)} watching
    </span>
  );
}
