import { readResponseJson } from "@/lib/fetch-json";
import type { StreamSnapshot } from "@/lib/stream-store";
import {
  draftToSetup,
  suggestShowName,
  type ShowSetupDraft,
  writeShowSetupDraft,
} from "@/lib/show-setup";

export type CreatedShowSession = {
  slug: string;
  title: string;
  room: string;
  token: string;
  url: string;
  snapshot?: StreamSnapshot;
};

export type ScheduledShowResult = {
  slug: string;
  title: string;
  scheduledFor: string;
  scheduled: true;
};

const PENDING_LIVE_KEY = "frontrow:pending-live";

/** Create a show from a completed setup draft and return LiveKit credentials. */
export async function createLiveShow(
  draft: ShowSetupDraft,
  title: string,
  options?: { liveShowSlug?: string | null },
): Promise<CreatedShowSession> {
  const normalized =
    !draft.showName.trim() && !draft.nameTouched
      ? { ...draft, showName: suggestShowName(draft) }
      : draft;
  writeShowSetupDraft(normalized);

  const setup = draftToSetup(normalized);
  const res = await fetch("/api/shows", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: title.trim() || normalized.showName.trim() || "Untitled show",
      setup: setup ?? undefined,
      challengeSlug: normalized.challengeSlug ?? undefined,
    }),
  });

  const data = await readResponseJson<{
    error?: string;
    slug: string;
    title: string;
    room: string;
    token: string;
    url: string;
    snapshot?: StreamSnapshot;
  }>(res);

  if (!res.ok) {
    if (res.status === 409 && options?.liveShowSlug) {
      throw new Error(
        "You already have a live show. Reconnect below or end it first.",
      );
    }
    throw new Error(data.error ?? "Failed to start show");
  }

  return {
    slug: data.slug,
    title: data.title,
    room: data.room,
    token: data.token,
    url: data.url,
    snapshot: data.snapshot,
  };
}

/** Schedule a show for a future time — no LiveKit session yet. */
export async function scheduleShow(
  draft: ShowSetupDraft,
  title: string,
  scheduledFor: Date,
): Promise<ScheduledShowResult> {
  const normalized =
    !draft.showName.trim() && !draft.nameTouched
      ? { ...draft, showName: suggestShowName(draft) }
      : draft;
  writeShowSetupDraft(normalized);

  const setup = draftToSetup(normalized);
  const res = await fetch("/api/shows", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: title.trim() || normalized.showName.trim() || "Untitled show",
      setup: setup ?? undefined,
      challengeSlug: normalized.challengeSlug ?? undefined,
      scheduledFor: scheduledFor.toISOString(),
    }),
  });

  const data = await readResponseJson<{
    error?: string;
    slug: string;
    title: string;
    scheduledFor: string;
    scheduled?: boolean;
  }>(res);

  if (!res.ok) {
    throw new Error(data.error ?? "Failed to schedule show");
  }

  return {
    slug: data.slug,
    title: data.title,
    scheduledFor: data.scheduledFor,
    scheduled: true,
  };
}

/** Go live from a previously scheduled show. */
export async function startScheduledShow(
  slug: string,
): Promise<CreatedShowSession> {
  const res = await fetch(`/api/shows/${slug}/start`, { method: "POST" });

  const data = await readResponseJson<{
    error?: string;
    slug: string;
    title: string;
    room: string;
    token: string;
    url: string;
  }>(res);

  if (!res.ok) {
    throw new Error(data.error ?? "Failed to start show");
  }

  return {
    slug: data.slug,
    title: data.title,
    room: data.room,
    token: data.token,
    url: data.url,
  };
}

export function writePendingLiveSession(session: CreatedShowSession): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(PENDING_LIVE_KEY, JSON.stringify(session));
  } catch {
    // Private mode — caller should fall back to resume-by-slug.
  }
}

export function readPendingLiveSession(): CreatedShowSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PENDING_LIVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CreatedShowSession>;
    if (
      typeof parsed.slug !== "string" ||
      typeof parsed.title !== "string" ||
      typeof parsed.room !== "string" ||
      typeof parsed.token !== "string" ||
      typeof parsed.url !== "string"
    ) {
      return null;
    }
    return parsed as CreatedShowSession;
  } catch {
    return null;
  }
}

export function clearPendingLiveSession(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(PENDING_LIVE_KEY);
  } catch {
    // ignore
  }
}
