"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

/**
 * A `<video>` bound to a `MediaStream`.
 *
 * `srcObject` can only be set imperatively, and the same `MediaStream` can back
 * any number of these — which is how the host preview and the viewer stage show
 * the identical feed without capturing twice.
 */
export function StreamVideo({
  stream,
  className,
  style,
  mirrored = false,
  onAspectChange,
}: {
  stream: MediaStream | null;
  className?: string;
  style?: React.CSSProperties;
  mirrored?: boolean;
  /**
   * Fires with `videoWidth / videoHeight` once known, and again whenever it
   * changes — which it does mid-share when the host switches windows or the
   * captured surface resizes.
   */
  onAspectChange?: (aspect: number) => void;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const onAspectChangeRef = useRef(onAspectChange);
  useEffect(() => {
    onAspectChangeRef.current = onAspectChange;
  }, [onAspectChange]);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }
    if (stream) {
      void video.play().catch(() => {
        // Muted + playsInline means autoplay is allowed; a rejection here is a
        // transient race with mounting and resolves itself.
      });
    }

    function report() {
      const el = ref.current;
      if (!el?.videoWidth || !el.videoHeight) return;
      onAspectChangeRef.current?.(el.videoWidth / el.videoHeight);
    }

    report();
    // `resize` is the element's own intrinsic-size event, not a window event.
    video.addEventListener("loadedmetadata", report);
    video.addEventListener("resize", report);
    return () => {
      video.removeEventListener("loadedmetadata", report);
      video.removeEventListener("resize", report);
    };
  }, [stream]);

  return (
    <video
      ref={ref}
      muted
      playsInline
      autoPlay
      className={cn("h-full w-full object-cover", mirrored && "scale-x-[-1]", className)}
      style={style}
    />
  );
}
