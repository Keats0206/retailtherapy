"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
 * Head framing for a `<video>` that someone else owns.
 *
 * The hook does no capture of its own: hand it any playing element via `attach`
 * — a local preview, a detached probe, or the `<video>` LiveKit renders for a
 * *remote* camera track — and it returns the CSS that crops that element down to
 * a head. Framing on whichever side is rendering means the wire feed stays full
 * frame, so the crop costs no bandwidth and viewers get it even though the
 * detection is running nowhere near the host's camera.
 *
 * `attach` is a stable callback ref, so it can be passed straight to `ref`.
 */
export function useFaceFrame({
  enabled = true,
  zoom = 1.4,
  detector,
  applyToSource = false,
}: {
  /** Pause the loop without unmounting — e.g. camera muted. */
  enabled?: boolean;
  /** Extra punch-in past `cover`. ~1.4 gives head-and-shoulders on a 16:9 cam. */
  zoom?: number;
  /** Override the detector (e.g. drop in MediaPipe). Defaults to native-or-none. */
  detector?: FaceDetectorFn | null;
  /**
   * Write the framing onto the attached element rather than returning it as
   * state. Use this when the attached element is the one on screen: a state
   * update per animation frame would re-render the tree — and re-running a
   * `<video>`'s ref callback — sixty times a second for a purely visual change.
   */
  applyToSource?: boolean;
} = {}) {
  const [source, setSource] = useState<HTMLVideoElement | null>(null);
  const faceRef = useRef<FaceBox>(HEURISTIC_FACE_BOX);
  const detectorRef = useRef<FaceDetectorFn | null>(null);
  const detectInFlight = useRef(false);

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

  useEffect(() => {
    if (!enabled || !source) return;

    let cancelled = false;
    let raf: number | null = null;
    let lastDetectAt = 0;
    let lastFrameAt: number | null = null;

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      const video = source;
      if (!video?.videoWidth) return;

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
        void Promise.resolve(detect(video))
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

      const next = faceFrameStyle(
        faceRef.current,
        video.videoWidth / video.videoHeight,
        zoom,
      );
      if (applyToSource) {
        video.style.objectPosition = next.objectPosition;
        video.style.transform = next.transform;
        video.style.transformOrigin = next.transformOrigin;
      } else {
        setStyle(next);
      }
    }

    raf = requestAnimationFrame(frame);

    return () => {
      cancelled = true;
      if (raf != null) cancelAnimationFrame(raf);
    };
  }, [applyToSource, enabled, source, zoom]);

  // Ignore repeat calls with the same element: LiveKit re-runs its video ref on
  // every render, and re-seeding state each time would restart the loop.
  const attachedRef = useRef<HTMLVideoElement | null>(null);
  const attach = useCallback((video: HTMLVideoElement | null) => {
    if (attachedRef.current === video) return;
    attachedRef.current = video;
    setSource(video);
  }, []);

  return { attach, style, mode };
}
