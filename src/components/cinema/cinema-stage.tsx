"use client";

import { useCallback, useState } from "react";
import { MousePointer2, Plus } from "lucide-react";

import { StreamVideo } from "@/components/cinema/stream-video";
import { cn } from "@/lib/utils";

export type StageBackdrop = "aurora" | "sunset" | "dusk" | "mono";
export type BubbleShape = "circle" | "squircle";
export type BubbleCorner =
  | "bottom-left"
  | "bottom-right"
  | "top-left"
  | "top-right";

/** Padding around the floating screen, as a fraction of the stage width. */
export type StagePadding = "none" | "snug" | "roomy";

export type ClickRipple = { id: number; x: number; y: number };

/** A host-placed "this is the product" target, in video-frame coordinates. */
export type Hotspot = {
  id: string;
  x: number;
  y: number;
  label: string;
  price?: string;
  saved?: boolean;
};

const BACKDROPS: Record<StageBackdrop, string> = {
  aurora:
    "bg-[radial-gradient(at_18%_22%,oklch(0.72_0.17_195)_0px,transparent_55%),radial-gradient(at_82%_18%,oklch(0.78_0.16_85)_0px,transparent_50%),radial-gradient(at_72%_88%,oklch(0.66_0.22_330)_0px,transparent_55%),linear-gradient(140deg,oklch(0.55_0.15_265),oklch(0.38_0.12_290))]",
  sunset:
    "bg-[radial-gradient(at_15%_85%,oklch(0.74_0.19_35)_0px,transparent_55%),radial-gradient(at_85%_25%,oklch(0.80_0.16_75)_0px,transparent_50%),radial-gradient(at_50%_100%,oklch(0.62_0.24_10)_0px,transparent_60%),linear-gradient(150deg,oklch(0.58_0.20_25),oklch(0.42_0.16_340))]",
  dusk:
    "bg-[radial-gradient(at_25%_15%,oklch(0.60_0.18_275)_0px,transparent_55%),radial-gradient(at_80%_80%,oklch(0.55_0.20_320)_0px,transparent_55%),linear-gradient(160deg,oklch(0.32_0.10_275),oklch(0.20_0.06_285))]",
  mono: "bg-[linear-gradient(150deg,oklch(0.34_0_0),oklch(0.18_0_0))]",
};

const PADDING: Record<StagePadding, string> = {
  none: "p-0",
  snug: "p-[3.5%]",
  roomy: "p-[7%]",
};

const CORNER: Record<BubbleCorner, string> = {
  "bottom-left": "left-[4%] bottom-[5%]",
  "bottom-right": "right-[4%] bottom-[5%]",
  "top-left": "left-[4%] top-[5%]",
  "top-right": "right-[4%] top-[5%]",
};

/**
 * The viewer-side stage: the host's screen, auto-zoomed toward their cursor,
 * floating on a backdrop, with their head in a bubble over the corner — plus the
 * host's product markers anchored to the pixels.
 *
 * ## Everything hangs off one coordinate space
 *
 * Cursor telemetry and host hotspots both arrive as fractions of the *video
 * frame*. So the element they're positioned against has to be exactly the video
 * frame — not a 16:9 box with the video letterboxed inside it, or every marker
 * sits off by the size of the black bars.
 *
 * Hence `--a` and the `min(100cqw, 100cqh * a)` width: the frame is sized to the
 * stream's true aspect ratio and centered in the padded area, so its `0..1` box
 * *is* the video's `0..1` box. Markers then live inside the scaled layer and
 * inherit the zoom for free, counter-scaling their own chrome via
 * `--cinema-inv-scale` so they don't balloon at 2×.
 */
export function CinemaStage({
  screenStream,
  stageRef,
  cursorRef,
  ripples = [],
  hotspots = [],
  backdrop = "aurora",
  padding = "snug",
  showCursor = true,
  faceBubble,
  bubbleCorner = "bottom-left",
  bubbleShape = "circle",
  bubbleSize = 22,
  overlay,
  emptyState,
  compact = false,
  fill = false,
  animatedBackdrop = false,
  onHotspotClick,
  className,
}: {
  screenStream: MediaStream | null;
  stageRef?: React.Ref<HTMLDivElement>;
  cursorRef?: React.Ref<HTMLDivElement>;
  ripples?: ClickRipple[];
  hotspots?: Hotspot[];
  backdrop?: StageBackdrop;
  padding?: StagePadding;
  showCursor?: boolean;
  faceBubble?: React.ReactNode;
  bubbleCorner?: BubbleCorner;
  bubbleShape?: BubbleShape;
  /** Bubble diameter as a percentage of stage width. */
  bubbleSize?: number;
  overlay?: React.ReactNode;
  emptyState?: React.ReactNode;
  /** Shrinks marker chrome for small viewports. */
  compact?: boolean;
  /**
   * Fill the parent instead of sizing to the stream's aspect ratio. The video
   * still keeps its true aspect and centers itself, so the backdrop shows through
   * around it — which is what makes a landscape stream work inside a phone.
   */
  fill?: boolean;
  /** Slowly drift the backdrop colour behind the video. */
  animatedBackdrop?: boolean;
  onHotspotClick?: (hotspot: Hotspot) => void;
  className?: string;
}) {
  const [aspect, setAspect] = useState(16 / 9);

  const handleAspect = useCallback((next: number) => {
    if (Number.isFinite(next) && next > 0) setAspect(next);
  }, []);

  const markerScale = "scale(var(--cinema-inv-scale, 1))";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl",
        fill ? "h-full w-full" : "w-full",
        BACKDROPS[backdrop],
        className,
      )}
      style={fill ? undefined : { aspectRatio: String(aspect) }}
    >
      {animatedBackdrop ? (
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 origin-center blur-2xl",
            BACKDROPS[backdrop],
            "cinema-backdrop-drift",
          )}
        />
      ) : null}

      <div className={cn("absolute inset-0 [container-type:size]", PADDING[padding])}>
        <div className="flex h-full w-full items-center justify-center">
          <div
            className="relative overflow-hidden rounded-xl bg-black/40 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.75)] ring-1 ring-white/10"
            style={{
              // The frame *is* the video, so marker coordinates are exact.
              ["--a" as string]: String(aspect),
              width: "min(100cqw, calc(100cqh * var(--a)))",
              aspectRatio: String(aspect),
            }}
          >
            {screenStream ? (
              <>
                <div
                  ref={stageRef}
                  data-cinema-scaled
                  className="absolute inset-0 will-change-transform"
                  style={{ transform: "scale(1)", transformOrigin: "50% 50%" }}
                >
                  {/* Aspect matches the frame exactly, so `fill` never distorts. */}
                  <StreamVideo
                    stream={screenStream}
                    className="object-fill"
                    onAspectChange={handleAspect}
                  />

                  {ripples.map((ripple) => (
                    <span
                      key={ripple.id}
                      aria-hidden
                      className="pointer-events-none absolute block"
                      style={{
                        left: `${ripple.x * 100}%`,
                        top: `${ripple.y * 100}%`,
                        transform: markerScale,
                      }}
                    >
                      <span className="cinema-click-ripple block size-24 rounded-full border-2 border-white/70 bg-white/15" />
                    </span>
                  ))}

                  {hotspots.map((hotspot) => (
                    <button
                      key={hotspot.id}
                      type="button"
                      onClick={() => onHotspotClick?.(hotspot)}
                      className="group absolute z-10 flex origin-center items-center gap-2 outline-none"
                      style={{
                        left: `${hotspot.x * 100}%`,
                        top: `${hotspot.y * 100}%`,
                        transform: `translate(-50%, -50%) ${markerScale}`,
                      }}
                    >
                      <span
                        className={cn(
                          "flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 shadow-lg backdrop-blur-sm transition-colors",
                          hotspot.saved
                            ? "bg-live text-live-foreground"
                            : "bg-white/95 text-black group-hover:bg-white",
                          compact && "pr-2 text-xs",
                        )}
                      >
                        <span className="flex size-5 items-center justify-center rounded-full bg-black/10">
                          <Plus className="size-3" />
                        </span>
                        <span
                          className={cn(
                            "max-w-[16ch] truncate font-medium",
                            compact ? "text-[11px]" : "text-xs",
                          )}
                        >
                          {hotspot.saved ? "Saved" : hotspot.label}
                        </span>
                        {hotspot.price && !hotspot.saved ? (
                          <span
                            className={cn(
                              "text-black/50",
                              compact ? "text-[11px]" : "text-xs",
                            )}
                          >
                            {hotspot.price}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  ))}

                </div>

                {showCursor ? (
                  <div
                    ref={cursorRef}
                    aria-hidden
                    className="pointer-events-none absolute z-20 opacity-0 transition-opacity duration-300"
                    style={{ left: "50%", top: "50%" }}
                  >
                    {/* A soft halo so the host's pointer stays findable over busy
                        product photography, where a bare arrow disappears. */}
                    <span className="absolute -translate-x-1/2 -translate-y-1/2">
                      <span className="block size-7 rounded-full bg-live/25 ring-1 ring-live/40" />
                    </span>
                    <MousePointer2
                      className="relative size-6 fill-white text-black drop-shadow-[0_2px_6px_rgba(0,0,0,0.65)]"
                      strokeWidth={1.5}
                    />
                  </div>
                ) : null}
              </>
            ) : (
              <div className="flex h-full w-full items-center justify-center p-8 text-center">
                {emptyState}
              </div>
            )}

            {overlay}
          </div>
        </div>
      </div>

      {faceBubble ? (
        <div
          className={cn("absolute z-30", CORNER[bubbleCorner])}
          style={{ width: `${bubbleSize}%` }}
        >
          <div
            className={cn(
              "relative aspect-square w-full overflow-hidden bg-black/60 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.8)] ring-2 ring-white/25",
              bubbleShape === "circle" ? "rounded-full" : "rounded-[28%]",
            )}
          >
            {faceBubble}
          </div>
        </div>
      ) : null}
    </div>
  );
}
