import type { StreamSnapshot } from "@/lib/stream-store";

/** Post-show recap data shared by creator and viewer pages. */
export type EndedShowRecap = {
  slug: string;
  title: string;
  host: string;
  thumbnailUrl: string;
  endedAt: number;
  peakViewers: number;
  chatCount: number;
  durationMs: number;
  snapshot: StreamSnapshot;
  /** Set once Mux finishes packaging the recording. */
  muxPlaybackId?: string | null;
};

export function buildEndedRecap(opts: {
  slug: string;
  title: string;
  host: string;
  snapshot: StreamSnapshot;
  startedAt: number | null;
  peakViewers: number;
  chatCount: number;
  muxPlaybackId?: string | null;
  endedAt?: number;
}): EndedShowRecap {
  const now = Date.now();
  const endedAt = opts.endedAt ?? now;
  return {
    slug: opts.slug,
    title: opts.title,
    host: opts.host,
    thumbnailUrl: opts.snapshot.trail[0]?.imageUrl ?? "",
    endedAt,
    peakViewers: opts.peakViewers,
    chatCount: opts.chatCount,
    durationMs: opts.startedAt ? endedAt - opts.startedAt : 0,
    snapshot: opts.snapshot,
    muxPlaybackId: opts.muxPlaybackId,
  };
}
