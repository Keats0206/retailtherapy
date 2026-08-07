import type { Show } from "@/lib/shows";
import { snapshotOf } from "@/lib/shows";
import type { StreamSnapshot } from "@/lib/stream-store";

export type RecordingStatus = "ready" | "processing" | "unavailable" | "failed";

const PROCESSING_WINDOW_MS = 30 * 60 * 1000;

/** Public show payload — no credentials or internal ids. */
export type PublicShow = {
  slug: string;
  title: string;
  hostName: string | null;
  status: "scheduled" | "live" | "ended";
  roomName: string;
  muxPlaybackId: string | null;
  muxDurationSeconds: number | null;
  recordingStatus: RecordingStatus;
  snapshot: StreamSnapshot;
  scheduledFor: string | null;
  startedAt: string | null;
  endedAt: string | null;
};

export function getRecordingStatus(
  show: Pick<
    Show,
    | "status"
    | "muxAssetId"
    | "recordingCaptured"
    | "endedAt"
    | "muxLiveStreamId"
  >,
): RecordingStatus {
  if (show.muxAssetId) return "ready";
  if (show.status !== "ended") return "processing";
  if (!show.recordingCaptured) return "unavailable";

  if (!show.endedAt) return "processing";

  const ageMs = Date.now() - show.endedAt.getTime();
  if (ageMs < PROCESSING_WINDOW_MS) return "processing";

  return "failed";
}

export function toPublicShow(show: Show): PublicShow {
  return {
    slug: show.slug,
    title: show.title,
    hostName: show.hostName,
    status: show.status,
    roomName: show.roomName,
    muxPlaybackId: show.muxPlaybackId,
    muxDurationSeconds: show.muxDurationSeconds,
    recordingStatus: getRecordingStatus(show),
    snapshot: snapshotOf(show),
    scheduledFor: show.scheduledFor?.toISOString() ?? null,
    startedAt: show.startedAt?.toISOString() ?? null,
    endedAt: show.endedAt?.toISOString() ?? null,
  };
}
