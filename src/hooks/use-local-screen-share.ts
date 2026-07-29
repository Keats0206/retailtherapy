"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  getShareDisplaySurface,
  type ShareDisplaySurface,
} from "@/lib/screen-share-surface";

/**
 * A plain `getDisplayMedia` screen share, no LiveKit involved.
 *
 * The prototype runs both "sides" in one tab, so it needs the raw stream rather
 * than a published track. One `MediaStream` can back several `<video>` elements,
 * which is how the host preview and the viewer stage stay perfectly in sync
 * without any duplication.
 */
export function useLocalScreenShare() {
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [surface, setSurface] = useState<ShareDisplaySurface | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
    setSurface(undefined);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setStarting(true);
    try {
      const next = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 30 } },
        audio: false,
      });

      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = next;
      setStream(next);

      const [track] = next.getVideoTracks();
      setSurface(getShareDisplaySurface(track));

      // The browser's own "Stop sharing" bar bypasses our UI entirely.
      track?.addEventListener("ended", () => {
        streamRef.current = null;
        setStream(null);
        setSurface(undefined);
      });
    } catch (err) {
      setError(shareErrorMessage(err));
    } finally {
      setStarting(false);
    }
  }, []);

  useEffect(() => stop, [stop]);

  return { stream, surface, error, starting, start, stop, sharing: stream != null };
}

function shareErrorMessage(err: unknown): string {
  if (err instanceof DOMException) {
    if (err.name === "NotAllowedError") {
      return "Screen share permission was denied.";
    }
    if (err.name === "AbortError") {
      return "Screen share was cancelled.";
    }
  }
  return "Could not start screen share.";
}
