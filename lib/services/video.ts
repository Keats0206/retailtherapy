/**
 * Video service seam. The prototype renders a placeholder "screen share" stage and an
 * optional local camera preview via getUserMedia. When keys exist, add a real branch
 * (LiveKit room + screen-share track + camera track) behind the same functions.
 */
export const USE_MOCKS = true;

/** Attempt a real local camera preview (creator studio only). Best-effort. */
export async function startCameraPreview(): Promise<MediaStream | null> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return null;
  }
  try {
    return await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  } catch {
    return null;
  }
}

/**
 * Capture the creator's screen/tab/window via the browser picker. Returns null if the
 * API is unavailable or the user cancels. (Later, LiveKit publishes this as a track.)
 */
export async function startScreenShare(): Promise<MediaStream | null> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getDisplayMedia) {
    return null;
  }
  try {
    return await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
  } catch {
    // User cancelled the picker or permission denied.
    return null;
  }
}

export function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
}
