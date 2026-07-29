/**
 * Cursor telemetry — the wire format that lets viewers reconstruct the host's
 * mouse without baking zoom into the video.
 *
 * Coordinates are normalized to 0..1 of the *shared surface*, never pixels, so
 * a 4K host and a phone viewer agree on where the cursor is. Payloads are tiny
 * (~40 bytes) and lossy by design: drop a move and the next one corrects it.
 */

export const CINEMA_TELEMETRY_TOPIC = "cinema.cursor";

export type CursorEvent =
  | { k: "m"; x: number; y: number; t: number }
  | { k: "c"; x: number; y: number; t: number }
  | { k: "r"; t: number }
  /**
   * Hotspot: "the product I'm talking about is *here* on screen".
   *
   * This is what makes the video shoppable without any pixel analysis. The host
   * already tells us which product they're showing; their click tells us where it
   * sits in the frame. Viewers get a tappable target anchored to those
   * coordinates, so it pans and zooms in lockstep with the pixels underneath it.
   */
  | { k: "h"; x: number; y: number; id: string; t: number };

/** Human-readable aliases for the terse wire kinds. */
export const CursorEventKind = {
  Move: "m",
  Click: "c",
  Release: "r",
  Hotspot: "h",
} as const;

const enc = new TextEncoder();
const dec = new TextDecoder();

/** Round to 4 decimals — ~0.5px of a 4K surface, and much shorter on the wire. */
function q(n: number): number {
  return Math.round(n * 1e4) / 1e4;
}

export function encodeCursorEvent(event: CursorEvent): Uint8Array {
  let compact: CursorEvent;
  if (event.k === "r") {
    compact = { k: "r", t: Math.round(event.t) };
  } else if (event.k === "h") {
    compact = {
      k: "h",
      x: q(event.x),
      y: q(event.y),
      id: event.id,
      t: Math.round(event.t),
    };
  } else {
    compact = { k: event.k, x: q(event.x), y: q(event.y), t: Math.round(event.t) };
  }
  return enc.encode(JSON.stringify(compact));
}

export function decodeCursorEvent(payload: Uint8Array): CursorEvent | null {
  try {
    const raw: unknown = JSON.parse(dec.decode(payload));
    if (!raw || typeof raw !== "object") return null;
    const candidate = raw as Record<string, unknown>;
    const { k, t } = candidate;
    if (typeof t !== "number") return null;
    if (k === "r") return { k: "r", t };
    if (k !== "m" && k !== "c" && k !== "h") return null;
    const { x, y } = candidate;
    if (typeof x !== "number" || typeof y !== "number") return null;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    if (k === "h") {
      const { id } = candidate;
      if (typeof id !== "string" || id.length === 0) return null;
      return { k: "h", x: clamp01(x), y: clamp01(y), id, t };
    }
    return { k, x: clamp01(x), y: clamp01(y), t };
  } catch {
    return null;
  }
}

export function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

/**
 * Whether we can map real pointer events into the captured frame's coordinates.
 *
 * Two of the three surfaces work, for different reasons:
 * - `browser` — the captured pixels *are* this viewport, so `clientX/innerWidth`
 *   is exact.
 * - `monitor` — `screenX/screen.width` gives the cursor's true position on the
 *   display, which is exactly the captured frame.
 * - `window` — script can't read another window's position or size, so there's no
 *   way to convert into that frame. This is the one that has to fall back.
 *
 * Separate from all of this is *when* events arrive: the DOM only reports the
 * pointer while it's over our own document, so moving onto another app pauses the
 * stream. Screen.studio avoids that by being a native app with global event
 * access; a web page can't.
 */
export function canTrackCursor(
  surface: "browser" | "window" | "monitor" | undefined,
): boolean {
  return surface === "browser" || surface === "monitor";
}

export function cursorTrackingHint(
  surface: "browser" | "window" | "monitor" | undefined,
): string {
  switch (surface) {
    case "browser":
      return "Sharing this tab — your real cursor is tracked exactly. Move the mouse over this page and watch it on the viewer stage.";
    case "monitor":
      return "Sharing your whole screen — your real cursor is tracked in screen coordinates. It updates while the pointer is over this page and holds its last position elsewhere, since browsers can't see the cursor over other apps.";
    case "window":
      return "Sharing another window. Script can't read that window's position, so there's no way to map the cursor into it — switch cursor input to Sim, or share this tab or your whole screen for real tracking.";
    default:
      return "Not sharing yet.";
  }
}
