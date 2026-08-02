/**
 * Head framing math — crop a landscape webcam feed down to a head, inside a
 * circle, without stretching anything.
 *
 * We do it with `object-position` + `scale`/`transform-origin` rather than by
 * sizing an inner element, because that needs no knowledge of the container's
 * pixel size — so it survives resizes, PiP, and viewport changes for free.
 *
 * The two axes are handled differently, which is the whole trick:
 *
 * - The axis that **overflows** under `object-fit: cover` (horizontal, for a
 *   landscape camera in a square) is cropped with `object-position`. That is an
 *   exact pre-scale crop and it self-clamps at the edges.
 * - The axis that exactly **fits** has no overflow to slide, so we bias it with
 *   `transform-origin` under `scale(z)`. Same identity the zoom engine uses:
 *   with origin `o` and scale `z`, the visible window is
 *   `[o(1 - 1/z), o + (1 - o)/z]`, always inside `[0, 1]` for `z >= 1`.
 */

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

/** A face box in normalized (0..1) coordinates of the camera frame. */
export type FaceBox = {
  /** Center of the head. */
  cx: number;
  cy: number;
  /** Size of the head as a fraction of the frame. */
  w: number;
  h: number;
};

/**
 * Where a head usually sits in a webcam frame when someone is at a desk:
 * horizontally centered, and noticeably above the vertical middle because the
 * torso eats the bottom half. Used until (or unless) real detection reports in.
 */
export const HEURISTIC_FACE_BOX: FaceBox = {
  cx: 0.5,
  cy: 0.38,
  w: 0.3,
  h: 0.4,
};

/**
 * Solve for the `transform-origin` on an axis that fits exactly, such that the
 * visible window centers on `focus` at scale `z`.
 *
 * From `center(o) = o + (1 - 2o) / (2z)`, setting `center(o) = focus` gives
 * `o = (2z·focus - 1) / (2z - 2)`. Clamped, because a focus point closer to the
 * edge than the half-window simply can't be centered — and shouldn't be, since
 * doing so would reveal blank space.
 */
export function originForFocus(focus: number, z: number): number {
  if (z <= 1.0001) return 0.5;
  return clamp01((2 * z * focus - 1) / (2 * z - 2));
}

/**
 * Solve for `object-position` on an axis that overflows, so the visible window
 * centers on `focus`. `visibleFrac` is how much of the source is visible on that
 * axis under `cover` (e.g. `1/aspect` horizontally for a landscape source in a
 * square box).
 */
export function objectPositionForFocus(focus: number, visibleFrac: number): number {
  const slack = 1 - visibleFrac;
  if (slack <= 1e-6) return 0.5;
  return clamp01((focus - visibleFrac / 2) / slack);
}

export type FaceFrameStyle = {
  objectPosition: string;
  transform: string;
  transformOrigin: string;
};

/**
 * Build the CSS that frames `face` inside a square container.
 *
 * @param aspect Camera aspect ratio (width / height).
 * @param zoom   Extra punch-in past `cover`. 1 = just cover, ~1.4 = head-and-
 *               shoulders for a typical 16:9 webcam.
 */
export function faceFrameStyle(
  face: FaceBox,
  aspect: number,
  zoom: number,
): FaceFrameStyle {
  const a = Number.isFinite(aspect) && aspect > 0 ? aspect : 16 / 9;
  const z = Math.max(1, zoom);

  let posX = 0.5;
  let posY = 0.5;
  let originX = 0.5;
  let originY = 0.5;

  if (a >= 1) {
    // Landscape: horizontal overflows and is cropped; vertical fits and is biased.
    posX = objectPositionForFocus(face.cx, 1 / a);
    originY = originForFocus(face.cy, z);
  } else {
    // Portrait: the reverse.
    posY = objectPositionForFocus(face.cy, a);
    originX = originForFocus(face.cx, z);
  }

  return {
    objectPosition: `${(posX * 100).toFixed(2)}% ${(posY * 100).toFixed(2)}%`,
    transform: `scale(${z.toFixed(3)})`,
    transformOrigin: `${(originX * 100).toFixed(2)}% ${(originY * 100).toFixed(2)}%`,
  };
}

/** Exponentially smooth a face box toward a new observation. */
export function smoothFaceBox(
  current: FaceBox,
  target: FaceBox,
  tau: number,
  dt: number,
): FaceBox {
  if (tau <= 0) return target;
  const k = 1 - Math.exp(-dt / tau);
  return {
    cx: current.cx + (target.cx - current.cx) * k,
    cy: current.cy + (target.cy - current.cy) * k,
    w: current.w + (target.w - current.w) * k,
    h: current.h + (target.h - current.h) * k,
  };
}

/**
 * A pluggable head detector. `null` means "no observation this frame" — keep the
 * last known box rather than snapping back to a default.
 *
 * Swapping the heuristic for a real model (MediaPipe/BlazeFace) means providing
 * one of these; nothing else in the pipeline changes.
 */
export type FaceDetectorFn = (
  source: HTMLVideoElement,
) => Promise<FaceBox | null> | FaceBox | null;

type FaceDetectorCtor = new (options?: {
  maxDetectedFaces?: number;
  fastMode?: boolean;
}) => {
  detect(source: CanvasImageSource): Promise<
    Array<{ boundingBox: { x: number; y: number; width: number; height: number } }>
  >;
};

/**
 * The browser's own `FaceDetector`, when it exists.
 *
 * This is Chrome-only and sits behind #enable-experimental-web-platform-features,
 * so in practice it is usually absent — hence `null` and the heuristic fallback,
 * rather than pretending detection is happening.
 */
export function createNativeFaceDetector(): FaceDetectorFn | null {
  const ctor = (globalThis as { FaceDetector?: FaceDetectorCtor }).FaceDetector;
  if (typeof ctor !== "function") return null;

  const detector = new ctor({ maxDetectedFaces: 1, fastMode: true });

  return async (video) => {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return null;
    try {
      const faces = await detector.detect(video);
      const box = faces[0]?.boundingBox;
      if (!box) return null;
      // Bias the center upward into the forehead so the crop reads as a head
      // rather than a chin, and pad the box so hair isn't clipped.
      return {
        cx: clamp01((box.x + box.width / 2) / vw),
        cy: clamp01((box.y + box.height * 0.42) / vh),
        w: clamp01((box.width * 1.35) / vw),
        h: clamp01((box.height * 1.35) / vh),
      };
    } catch {
      return null;
    }
  };
}
