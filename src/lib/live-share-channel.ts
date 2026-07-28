/** Cross-tab live / screen-share state for host surfaces (browse window, etc.). */

export const LIVE_SHARE_CHANNEL = "frontrow-live-share";

export type LiveShareState = {
  slug: string;
  live: boolean;
  sharing: boolean;
  /** Capture Handle from the active screen-share track, if any. */
  captureHandle: string | null;
  /** Best-effort label from MediaStreamTrack (tab/window title). */
  surfaceLabel: string | null;
};

export type LiveShareMessage = {
  type: "state";
  state: LiveShareState;
};

export function publishLiveShare(state: LiveShareState) {
  if (typeof window === "undefined") return;
  const message: LiveShareMessage = { type: "state", state };
  try {
    new BroadcastChannel(LIVE_SHARE_CHANNEL).postMessage(message);
  } catch {
    // BroadcastChannel unavailable (very old browsers).
  }
  try {
    sessionStorage.setItem(LIVE_SHARE_CHANNEL, JSON.stringify(message));
  } catch {
    // Private mode / quota — channel alone is enough when it works.
  }
}

export function readStoredLiveShare(): LiveShareState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(LIVE_SHARE_CHANNEL);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LiveShareMessage;
    if (parsed.type !== "state") return null;
    return parsed.state;
  } catch {
    return null;
  }
}

export function subscribeLiveShare(
  onState: (state: LiveShareState | null) => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  onState(readStoredLiveShare());

  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(LIVE_SHARE_CHANNEL);
    channel.onmessage = (event: MessageEvent<LiveShareMessage>) => {
      if (event.data?.type === "state") onState(event.data.state);
    };
  } catch {
    // Fall back to storage events below.
  }

  function onStorage(event: StorageEvent) {
    if (event.key !== LIVE_SHARE_CHANNEL) return;
    onState(readStoredLiveShare());
  }
  window.addEventListener("storage", onStorage);

  return () => {
    channel?.close();
    window.removeEventListener("storage", onStorage);
  };
}

export function clearLiveShare() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(LIVE_SHARE_CHANNEL);
  } catch {
    // ignore
  }
  try {
    new BroadcastChannel(LIVE_SHARE_CHANNEL).postMessage({
      type: "state",
      state: {
        slug: "",
        live: false,
        sharing: false,
        captureHandle: null,
        surfaceLabel: null,
      },
    } satisfies LiveShareMessage);
  } catch {
    // ignore
  }
}
