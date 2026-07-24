import "server-only";

import { normalizeSnapshot } from "@/lib/interaction-models";
import type { StreamSnapshot } from "@/lib/stream-store";

const MAX_SNAPSHOT_BYTES = 256_000;
const MAX_TRAIL_ITEMS = 200;

export function validateSnapshot(snapshot: unknown): snapshot is StreamSnapshot {
  if (!snapshot || typeof snapshot !== "object") return false;

  const value = normalizeSnapshot(snapshot);
  const hasLegacyPinned =
    "pinnedId" in (snapshot as object) &&
    (snapshot as { pinnedId?: unknown }).pinnedId !== undefined;
  const hasActive = "active" in (snapshot as object);

  if (!hasActive && !hasLegacyPinned) return false;
  if (value.active !== null && typeof value.active !== "object") return false;
  if (value.trail.length > MAX_TRAIL_ITEMS) return false;
  if (!value.votes || typeof value.votes !== "object") return false;
  if (!value.verseVotes || typeof value.verseVotes !== "object") return false;

  return true;
}

export function snapshotTooLarge(body: string): boolean {
  return body.length > MAX_SNAPSHOT_BYTES;
}
