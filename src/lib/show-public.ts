import type { Show } from "@/lib/shows";
import { snapshotOf } from "@/lib/shows";
import type { StreamSnapshot } from "@/lib/stream-store";

/** Public show payload — no credentials or internal ids. */
export type PublicShow = {
  slug: string;
  title: string;
  hostName: string | null;
  status: "scheduled" | "live" | "ended";
  roomName: string;
  muxPlaybackId: string | null;
  snapshot: StreamSnapshot;
  startedAt: string | null;
  endedAt: string | null;
};

export function toPublicShow(show: Show): PublicShow {
  return {
    slug: show.slug,
    title: show.title,
    hostName: show.hostName,
    status: show.status,
    roomName: show.roomName,
    muxPlaybackId: show.muxPlaybackId,
    snapshot: snapshotOf(show),
    startedAt: show.startedAt?.toISOString() ?? null,
    endedAt: show.endedAt?.toISOString() ?? null,
  };
}
