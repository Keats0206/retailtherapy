"use client";

import { useEffect, useRef } from "react";

import { clamp01, type CursorEvent } from "@/lib/cinema/telemetry";
import type { ShareDisplaySurface } from "@/lib/screen-share-surface";

/** Cap move events at ~30/sec. Clicks are never throttled — they drive the zoom. */
const MOVE_INTERVAL_MS = 33;

export type TelemetrySource = "pointer" | "simulated" | "none";

/**
 * Produce cursor telemetry for the host to broadcast.
 *
 * `pointer` mode reads real DOM pointer events — the host's actual mouse. The
 * coordinate space depends on what's being captured, see `surface` below.
 *
 * The standing limitation is *when* we get events, not where they map to: the DOM
 * only reports the pointer while it is over our own document. Move onto another
 * application and the stream of events simply stops, and the last known position
 * is held.
 *
 * `simulated` mode synthesizes plausible browsing: glide to a point, click,
 * dwell, move on. Useful for demoing the zoom behavior without driving it by hand.
 */
export function useCursorTelemetry({
  source,
  surface,
  onEvent,
}: {
  source: TelemetrySource;
  /**
   * What's being captured. This decides the coordinate space, and getting it
   * wrong puts the cursor in the wrong place entirely:
   *
   * - `browser` — the captured pixels *are* this viewport, so normalize against
   *   `clientX / innerWidth`.
   * - `monitor` — the captured pixels are the whole display, so normalize against
   *   `screenX / screen.width`. Using viewport coordinates here would squash the
   *   cursor's whole range into wherever the browser window happens to sit.
   * - `window` — we can't know another window's rect from script, so viewport
   *   coordinates are the best available approximation.
   */
  surface?: ShareDisplaySurface;
  onEvent: (event: CursorEvent) => void;
}) {
  // Keep the callback in a ref so re-renders don't tear down the listeners.
  const onEventRef = useRef(onEvent);
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  // Real pointer events.
  useEffect(() => {
    if (source !== "pointer") return;

    let lastMoveAt = 0;

    function normalize(e: PointerEvent): { x: number; y: number } {
      if (surface === "monitor") {
        // Global screen coordinates — correct for a whole-display capture.
        const sw = window.screen.width || window.innerWidth;
        const sh = window.screen.height || window.innerHeight;
        return { x: clamp01(e.screenX / sw), y: clamp01(e.screenY / sh) };
      }
      return {
        x: clamp01(e.clientX / window.innerWidth),
        y: clamp01(e.clientY / window.innerHeight),
      };
    }

    function handleMove(e: PointerEvent) {
      const now = performance.now();
      if (now - lastMoveAt < MOVE_INTERVAL_MS) return;
      lastMoveAt = now;
      const { x, y } = normalize(e);
      onEventRef.current({ k: "m", x, y, t: now });
    }

    function handleDown(e: PointerEvent) {
      const { x, y } = normalize(e);
      onEventRef.current({ k: "c", x, y, t: performance.now() });
    }

    window.addEventListener("pointermove", handleMove, { passive: true });
    window.addEventListener("pointerdown", handleDown, { passive: true });
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerdown", handleDown);
    };
  }, [source, surface]);

  // Synthetic cursor.
  useEffect(() => {
    if (source !== "simulated") return;

    let raf = 0;
    let from = { x: 0.5, y: 0.5 };
    let to = pickTarget();
    let legStart = performance.now();
    let legMs = 900;
    let dwellUntil = 0;
    let clicked = false;

    function frame(now: number) {
      raf = requestAnimationFrame(frame);

      if (now < dwellUntil) return;

      const p = Math.min(1, (now - legStart) / legMs);
      const eased = easeInOutCubic(p);
      const x = from.x + (to.x - from.x) * eased;
      const y = from.y + (to.y - from.y) * eased;

      onEventRef.current({ k: "m", x, y, t: now });

      if (p >= 1) {
        if (!clicked) {
          // Land, then click — this is what punches the zoom in.
          onEventRef.current({ k: "c", x: to.x, y: to.y, t: now });
          clicked = true;
          dwellUntil = now + 1400 + Math.random() * 1200;
          return;
        }
        from = to;
        to = pickTarget();
        legStart = now;
        legMs = 700 + Math.random() * 900;
        clicked = false;
      }
    }

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [source]);
}

/** Keep synthetic targets off the extreme edges, where real clicks are rare. */
function pickTarget() {
  return {
    x: 0.12 + Math.random() * 0.76,
    y: 0.12 + Math.random() * 0.76,
  };
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
