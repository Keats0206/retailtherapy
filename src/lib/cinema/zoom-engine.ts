/**
 * Auto-zoom engine — the Screen.studio effect, minus the native app.
 *
 * The engine is deliberately pure and frame-rate independent: feed it cursor
 * telemetry plus a timestamp, ask it for a transform, and render that transform
 * however you like. No DOM, no React, so the host preview and the viewer stage
 * can run the exact same math on the exact same events.
 *
 * ## Focal point vs. transform origin
 *
 * These are *not* the same thing, and conflating them is the easy way to get
 * this wrong. The focal point is where the streamer's mouse is. The transform
 * origin is the CSS knob that produces a view containing it.
 *
 * We want the cursor's neighbourhood **centered** in frame — that is the
 * cinematic move, and it is what Screen.studio does. Setting `transform-origin`
 * to the cursor would instead *pin* the cursor wherever it already sits, so a
 * click in the top-left would zoom around the top-left and never travel.
 *
 * With origin `o` and scale `s`, a source point `p` lands at `o + (p - o)·s`, so
 * the visible source window runs `[o(1 - 1/s), o(1 - 1/s) + 1/s]` — width `1/s`,
 * starting at `o(1 - 1/s)`. To center that window on focus `f` we need it to
 * start at `f - 1/(2s)`, giving
 *
 *     o = (f - 1/(2s)) / (1 - 1/s)
 *
 * Clamping `o` to `[0, 1]` then handles the edges for free: a cursor closer to
 * the edge than half a window can't be centered, and the view simply stops at
 * the frame boundary instead of revealing blank space. See `centeredOrigin`.
 */

/** A pointer sample in normalized (0..1) coordinates of the shared surface. */
export type CursorSample = {
  x: number;
  y: number;
  /** performance.now() timestamp of the sample. */
  t: number;
};

export type ZoomConfig = {
  /** Scale applied on a click. 1 = no zoom. */
  zoomScale: number;
  /** How long to hold the zoom after the last click, in ms. */
  holdMs: number;
  /**
   * Cursor distance (in normalized units) from the focal point that triggers a
   * zoom-out. Small moves pan instead; a big jump means attention moved on.
   */
  breakoutRadius: number;
  /**
   * Cursor movement inside the focal point's deadzone is ignored, so the frame
   * doesn't jitter while the cursor wiggles in place.
   */
  panDeadzone: number;
  /** Seconds-scale time constants for the exponential smoothers. */
  scaleTau: number;
  focalTau: number;
};

export const DEFAULT_ZOOM_CONFIG: ZoomConfig = {
  zoomScale: 2,
  holdMs: 2600,
  breakoutRadius: 0.28,
  panDeadzone: 0.04,
  scaleTau: 0.42,
  focalTau: 0.5,
};

export type ZoomTransform = {
  scale: number;
  /** Where the streamer's mouse is, as a fraction of the video frame. */
  focalX: number;
  focalY: number;
  /**
   * The `transform-origin` that centers the focal point, clamped to the frame.
   * Anything mapping frame coordinates to screen coordinates must use *this*,
   * not the focal point — see `mapThroughTransform`.
   */
  originX: number;
  originY: number;
};

/**
 * The `transform-origin` on one axis that centers `focus` at `scale`, clamped so
 * the view never runs past the edge of the frame.
 */
export function centeredOrigin(focus: number, scale: number): number {
  if (scale <= 1.0001) return 0.5;
  const o = (focus - 1 / (2 * scale)) / (1 - 1 / scale);
  return o < 0 ? 0 : o > 1 ? 1 : o;
}

/**
 * Map a point in video-frame coordinates to where it actually appears on the
 * zoomed stage. Needed for any overlay drawn *outside* the scaled element (the
 * cursor indicator), since those don't inherit the transform.
 */
export function mapThroughTransform(
  x: number,
  y: number,
  t: ZoomTransform,
): { x: number; y: number } {
  return {
    x: t.originX + (x - t.originX) * t.scale,
    y: t.originY + (y - t.originY) * t.scale,
  };
}

export type ZoomPhase = "idle" | "zoomed";

const IDENTITY: ZoomTransform = {
  scale: 1,
  focalX: 0.5,
  focalY: 0.5,
  originX: 0.5,
  originY: 0.5,
};

function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

/**
 * Exponential smoothing toward a target. Frame-rate independent: the same `tau`
 * yields the same motion at 30fps and 144fps.
 */
function smooth(current: number, target: number, tau: number, dt: number): number {
  if (tau <= 0) return target;
  const alpha = 1 - Math.exp(-dt / tau);
  return current + (target - current) * alpha;
}

export class ZoomEngine {
  private config: ZoomConfig;

  /** Where we're animating to. */
  private targetScale = 1;
  private targetFocalX = 0.5;
  private targetFocalY = 0.5;

  /** Where we actually are. */
  private scale = 1;
  private focalX = 0.5;
  private focalY = 0.5;

  private phase: ZoomPhase = "idle";
  private lastClickAt = -Infinity;
  private lastCursor: CursorSample | null = null;
  private lastTickAt: number | null = null;

  constructor(config: Partial<ZoomConfig> = {}) {
    this.config = { ...DEFAULT_ZOOM_CONFIG, ...config };
  }

  setConfig(config: Partial<ZoomConfig>): void {
    this.config = { ...this.config, ...config };
    // A live zoomScale change should take effect without waiting for a click.
    if (this.phase === "zoomed") this.targetScale = this.config.zoomScale;
  }

  getConfig(): ZoomConfig {
    return { ...this.config };
  }

  getPhase(): ZoomPhase {
    return this.phase;
  }

  /** Punch in on a click. This is the only thing that *starts* a zoom. */
  click(sample: CursorSample): void {
    this.lastClickAt = sample.t;
    this.lastCursor = sample;
    this.phase = "zoomed";
    this.targetScale = this.config.zoomScale;
    this.targetFocalX = sample.x;
    this.targetFocalY = sample.y;
  }

  /**
   * Cursor moved. While zoomed this pans the frame (outside a deadzone) and can
   * break the zoom entirely if the cursor travels far from the focal point.
   * While idle it only records position, so passive mousing never zooms.
   */
  move(sample: CursorSample): void {
    this.lastCursor = sample;
    if (this.phase !== "zoomed") return;

    const drift = distance(sample.x, sample.y, this.targetFocalX, this.targetFocalY);
    if (drift > this.config.breakoutRadius) {
      this.release();
      return;
    }
    if (drift > this.config.panDeadzone) {
      this.targetFocalX = sample.x;
      this.targetFocalY = sample.y;
    }
  }

  /** Drop back to a full-frame view. */
  release(): void {
    this.phase = "idle";
    this.targetScale = 1;
  }

  /** Snap everything back to identity with no animation. */
  reset(): void {
    this.phase = "idle";
    this.targetScale = 1;
    this.targetFocalX = 0.5;
    this.targetFocalY = 0.5;
    this.scale = 1;
    this.focalX = 0.5;
    this.focalY = 0.5;
    this.lastClickAt = -Infinity;
    this.lastCursor = null;
    this.lastTickAt = null;
  }

  /**
   * Advance the animation to time `now` and read back the transform. Call this
   * once per rendered frame.
   */
  tick(now: number): ZoomTransform {
    const dt =
      this.lastTickAt == null ? 0 : Math.min((now - this.lastTickAt) / 1000, 0.1);
    this.lastTickAt = now;

    if (this.phase === "zoomed" && now - this.lastClickAt > this.config.holdMs) {
      this.release();
    }

    this.scale = smooth(this.scale, this.targetScale, this.config.scaleTau, dt);
    this.focalX = smooth(this.focalX, this.targetFocalX, this.config.focalTau, dt);
    this.focalY = smooth(this.focalY, this.targetFocalY, this.config.focalTau, dt);

    // Once we're visually back at 1x, recenter the focal point so the next
    // zoom-in doesn't inherit a stale origin and slide across the frame.
    if (this.phase === "idle" && this.scale < 1.002) {
      this.scale = 1;
      this.targetFocalX = 0.5;
      this.targetFocalY = 0.5;
    }

    return {
      scale: this.scale,
      focalX: this.focalX,
      focalY: this.focalY,
      originX: centeredOrigin(this.focalX, this.scale),
      originY: centeredOrigin(this.focalY, this.scale),
    };
  }

  /** True when the rendered transform is indistinguishable from identity. */
  isIdentity(): boolean {
    return this.scale < 1.002;
  }

  getCursor(): CursorSample | null {
    return this.lastCursor;
  }
}

export function transformToCss(t: ZoomTransform): {
  transform: string;
  transformOrigin: string;
} {
  return {
    transform: `scale(${t.scale.toFixed(4)})`,
    transformOrigin: `${(t.originX * 100).toFixed(3)}% ${(t.originY * 100).toFixed(3)}%`,
  };
}

export { IDENTITY as IDENTITY_TRANSFORM };
