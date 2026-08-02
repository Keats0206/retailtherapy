"use client";

import { useEffect, useState } from "react";

import { useFaceFrame, type FaceTrackingMode } from "@/hooks/use-face-frame";
import type { FaceDetectorFn } from "@/lib/cinema/face-frame";

export type { FaceTrackingMode };

/**
 * Webcam capture plus head framing.
 *
 * The hook keeps its **own detached `<video>`** for detection rather than taking
 * a ref from the caller. That matters for more than tidiness: the composition
 * shows the camera in two places at once (the viewer's bubble and the host's
 * preview), and a single ref object can only ever point at one element — the
 * second mount would silently steal it and the first would go black. Handing back
 * the `MediaStream` lets any number of `<video>` elements render the same feed.
 *
 * The framing itself lives in `useFaceFrame`, which the live stream reuses
 * against the `<video>` it is already rendering.
 */
export function useWebcamFace({
  enabled,
  zoom = 1.4,
  detector,
}: {
  enabled: boolean;
  /** Extra punch-in past `cover`. ~1.4 gives head-and-shoulders on a 16:9 cam. */
  zoom?: number;
  /** Override the detector (e.g. drop in MediaPipe). Defaults to native-or-none. */
  detector?: FaceDetectorFn | null;
}) {
  const { attach, style, mode } = useFaceFrame({ enabled, zoom, detector });

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Capture loop. Teardown lives entirely in the cleanup function, so flipping
  // `enabled` off tears down without touching state mid-render.
  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let live: MediaStream | null = null;

    // Detached on purpose: never mounted, never rendered, just decodes frames
    // for the detector to read.
    const probe = document.createElement("video");
    probe.muted = true;
    probe.playsInline = true;

    async function start() {
      setError(null);
      try {
        const next = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user",
          },
          audio: false,
        });
        if (cancelled) {
          next.getTracks().forEach((track) => track.stop());
          return;
        }
        live = next;
        probe.srcObject = next;
        await probe.play().catch(() => {
          // Detached elements can reject play(); frames still decode once the
          // track is live, so detection is unaffected.
        });
        setStream(next);
        attach(probe);
      } catch (err) {
        if (!cancelled) setError(cameraErrorMessage(err));
      }
    }

    void start();

    return () => {
      cancelled = true;
      attach(null);
      probe.srcObject = null;
      live?.getTracks().forEach((track) => track.stop());
      setStream(null);
    };
  }, [attach, enabled]);

  return { stream, style, ready: stream != null, error, mode };
}

function cameraErrorMessage(err: unknown): string {
  if (err instanceof DOMException) {
    if (err.name === "NotAllowedError") {
      return "Camera permission denied. Allow camera access and try again.";
    }
    if (err.name === "NotFoundError") {
      return "No camera found.";
    }
    if (err.name === "NotReadableError") {
      return "Your camera is in use by another app.";
    }
  }
  return "Could not start the camera.";
}
