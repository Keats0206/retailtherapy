"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { formatCount, formatRelative } from "@/lib/format";
import type { Creator, Session } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function LiveDot({ live }: { live: boolean }) {
  if (!live) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">
        Offline
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-white">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
      Live
    </span>
  );
}

interface CreatorHeaderProps {
  creator: Creator;
  session: Session;
  className?: string;
}

export function CreatorHeader({ creator, session, className }: CreatorHeaderProps) {
  const [following, setFollowing] = useState(false);
  const [upcoming, setUpcoming] = useState<string>("");
  const live = session.status === "live";

  // Compute relative time on the client only, to avoid SSR hydration drift.
  useEffect(() => {
    setUpcoming(formatRelative(creator.upcomingStreamAt));
  }, [creator.upcomingStreamAt]);

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Avatar className="h-11 w-11">
        <AvatarImage src={creator.avatarUrl} alt={creator.name} />
        <AvatarFallback>{creator.name.slice(0, 2)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold">{creator.name}</span>
          <LiveDot live={live} />
        </div>
        <div className="truncate text-sm text-muted-foreground">
          @{creator.handle} · {formatCount(creator.followers + (following ? 1 : 0))} followers
          {!live && upcoming && <> · next stream {upcoming}</>}
        </div>
      </div>
      <Button
        variant={following ? "secondary" : "default"}
        size="sm"
        onClick={() => setFollowing((f) => !f)}
      >
        {following ? "Following" : "Follow"}
      </Button>
    </div>
  );
}
