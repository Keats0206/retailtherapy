"use client";

import { cn } from "@/lib/utils";

/**
 * Sizing for the host confidence monitor. Camera gets the room; screen share
 * stays a smaller preview underneath.
 */
export const MONITOR_CAMERA =
  "aspect-[4/5] w-full min-h-56 sm:min-h-64 max-lg:aspect-square max-lg:min-h-0 max-lg:w-24 max-lg:shrink-0 sm:max-lg:w-28";
export const MONITOR_SHARE =
  "aspect-video w-full max-h-36 max-lg:max-h-none max-lg:min-h-0 max-lg:min-w-0 max-lg:flex-1";
/** @deprecated Use MONITOR_CAMERA / MONITOR_SHARE instead. */
export const MONITOR_FRAME = MONITOR_CAMERA;

/** Shared aside width for the host confidence monitor. */
export const MONITOR_ASIDE =
  "flex w-full shrink-0 flex-col gap-4 border-t border-border p-4 lg:w-80 lg:border-r lg:border-t-0 max-lg:sticky max-lg:bottom-0 max-lg:z-30 max-lg:gap-2 max-lg:border-t max-lg:bg-background max-lg:p-3 max-lg:pb-[max(0.75rem,env(safe-area-inset-bottom))] max-lg:shadow-[0_-1px_0_var(--border)]";

/** The host's camera riding in the corner of a screen share, viewer-side. */
export const CAMERA_BUBBLE =
  "absolute bottom-4 right-4 aspect-square w-24 border border-white/60 sm:w-32";

/** Full-stage container for the host while live — mirrors the viewer theatre pane. */
export const HOST_STAGE =
  "relative min-h-0 min-w-0 flex-1 bg-black max-lg:aspect-video max-lg:min-h-[40vh] max-lg:flex-none lg:h-full";

/** Host camera PiP on the stage (bottom-right, slightly larger than viewer bubble). */
export const HOST_CAMERA_BUBBLE =
  "absolute bottom-4 right-4 aspect-square w-24 border border-white/60 sm:w-36";

/** Tiny camera bubble inside the Document PiP preview. */
export const PIP_CAMERA_BUBBLE =
  "absolute bottom-1 right-1 aspect-square w-10 border border-white/60";

/** Compact screen-share preview in the Document PiP window. */
export const PIP_PREVIEW = "aspect-video max-h-28 w-full shrink-0";

/** Meet-style floating control bar centered at the bottom of the host stage. */
export const HOST_CONTROL_BAR =
  "pointer-events-none absolute inset-x-0 bottom-4 flex justify-center";
export const HOST_CONTROL_BAR_INNER =
  "pointer-events-auto flex items-center gap-1 rounded-full border border-white/15 bg-zinc-950 px-2 py-1.5 shadow-lg shadow-black/40 max-lg:gap-0.5 sm:gap-1.5";

/**
 * A black video box with a corner label. Wraps real `<VideoTrack>`s on /host
 * and stand-in text when media is off or unavailable.
 */
export function VideoFrame({
  label,
  className,
  children,
}: {
  label?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("relative overflow-hidden bg-black", className)}>
      {children}
      {label && (
        <span className="micro absolute left-2 top-2 text-white/70">
          {label}
        </span>
      )}
    </div>
  );
}

/** The "nothing here" state inside a `VideoFrame` — camera off, not sharing. */
export function VideoPlaceholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="micro flex h-full items-center justify-center text-center text-white/40">
      {children}
    </div>
  );
}
