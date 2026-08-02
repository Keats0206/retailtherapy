"use client";

import { VideoFrame } from "@/components/video-placeholder";
import { useFaceFrame } from "@/hooks/use-face-frame";
import { VideoTrack, type StageTrack } from "@/lib/live";

/**
 * The host's camera in the corner of a screen share, cropped to their head.
 *
 * A webcam is landscape and the bubble is square, so plain `object-cover` keeps
 * the middle of the frame and lands wherever the host happens to be sitting —
 * often off to one side. `useFaceFrame` slides the crop onto the face instead, and it
 * runs wherever this renders: the host stage, the floating window, and each
 * viewer's tab all frame the same full-frame feed independently, so nothing
 * extra crosses the wire.
 */
export function FaceBubble({
  trackRef,
  className,
  zoom,
}: {
  trackRef: StageTrack;
  /** Bubble geometry — one of the `*_CAMERA_BUBBLE` presets. */
  className?: string;
  /** Extra punch-in past `cover`. Small bubbles want a little less. */
  zoom?: number;
}) {
  const { attach } = useFaceFrame({ zoom, applyToSource: true });

  return (
    <VideoFrame className={className}>
      <VideoTrack
        trackRef={trackRef}
        videoRef={attach}
        className="h-full w-full object-cover"
      />
    </VideoFrame>
  );
}
