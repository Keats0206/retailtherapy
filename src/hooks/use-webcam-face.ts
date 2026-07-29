"use client";

import { useEffect, useRef, useState } from "react";

import {
  createNativeFaceDetector,
  faceFrameStyle,
  HEURISTIC_FACE_BOX,
  smoothFaceBox,
  type FaceBox,
  type FaceDetectorFn,
  type FaceFrameStyle,
} from "@/lib/cinema/face-frame";

export type FaceTrackingMode = "detected" | "heuristic";

/** How often to run detection. Faces move slowly; ~6/sec is plenty and cheap. */
const DETECT_INTERVAL_MS = 160;
/** Seconds-scale smoothing for the face box — slow enough to never look twitchy. */
const FACE_TAU = 0.35;

/**
 * Webcam capture plus head framing.
 *
 * The hook keeps its **own detached `<video>`** for detection rather than taking
 * a ref from the caller. That matters for more than tidiness: the composition
 * shows the camera in two places at once (the viewer's bubble and the host's
 * preview), and a single ref object can only ever point at one element — the
 * second mount would silently steal it and the first would go black. Handing back
 * the `MediaStream` lets any number of `<video>` elements render the same feed.
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
  const faceRef = useRef<FaceBox>(HEURISTIC_FACE_BOX);
  const detectorRef = useRef<FaceDetectorFn | null>(null);
  const detectInFlight = useRef(false);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<FaceTrackingMode>("heuristic");
  const [style, setStyle] = useState<FaceFrameStyle>(() =>
    faceFrameStyle(HEURISTIC_FACE_BOX, 16 / 9, zoom),
  );

  // Resolve the detector once. `undefined` means "decide for me"; an explicit
  // `null` means the caller wants the heuristic only.
  useEffect(() => {
    detectorRef.current =
      detector === undefined ? createNativeFaceDetector() : detector;
  }, [detector]);

  // Capture + detection loop. Teardown lives entirely in the cleanup function,
  // so flipping `enabled` off tears down without touching state mid-render.
  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let raf: number | null = null;
    let live: MediaStream | null = null;
    let lastDetectAt = 0;
    let lastFrameAt: number | null = null;

    // Detached on purpose: never mounted, never rendered, just decodes frames
    // for the detector to read.
    const probe = document.createElement("video");
    probe.muted = true;
    probe.playsInline = true;

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      if (!probe.videoWidth) return;

      const dt =
        lastFrameAt == null ? 0 : Math.min((now - lastFrameAt) / 1000, 0.1);
      lastFrameAt = now;

      const detect = detectorRef.current;
      if (
        detect &&
        !detectInFlight.current &&
        now - lastDetectAt > DETECT_INTERVAL_MS
      ) {
        lastDetectAt = now;
        detectInFlight.current = true;
        void Promise.resolve(detect(probe))
          .then((box) => {
            if (cancelled || !box) return;
            faceRef.current = smoothFaceBox(faceRef.current, box, FACE_TAU, 0.2);
            setMode("detected");
          })
          .catch(() => {
            // A failed detection is not fatal — hold the last known box.
          })
          .finally(() => {
            detectInFlight.current = false;
          });
      }

      if (!detect) {
        faceRef.current = smoothFaceBox(
          faceRef.current,
          HEURISTIC_FACE_BOX,
          FACE_TAU,
          dt,
        );
      }

      setStyle(faceFrameStyle(faceRef.current, probe.videoWidth / probe.videoHeight, zoom));
    }

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
        raf = requestAnimationFrame(frame);
      } catch (err) {
        if (!cancelled) setError(cameraErrorMessage(err));
      }
    }

    void start();

    return () => {
      cancelled = true;
      if (raf != null) cancelAnimationFrame(raf);
      probe.srcObject = null;
      live?.getTracks().forEach((track) => track.stop());
      setStream(null);
    };
  }, [enabled, zoom]);

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
