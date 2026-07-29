"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { CursorEvent } from "@/lib/cinema/telemetry";
import {
  mapThroughTransform,
  transformToCss,
  ZoomEngine,
  type ZoomConfig,
  type ZoomPhase,
} from "@/lib/cinema/zoom-engine";

/** Throttle the React-visible readout; the transform itself runs every frame. */
const READOUT_INTERVAL_MS = 120;

/**
 * Drive an auto-zoom stage from a stream of cursor events.
 *
 * The per-frame transform is written **straight to the DOM**, not through React
 * state — a 60fps setState would re-render the whole subtree (including the
 * `<video>` wrapper) every frame and stutter. Only the coarse readout used by
 * surrounding UI goes through state, at ~8fps.
 */
export function useZoomStage({
  enabled = true,
  config,
}: {
  enabled?: boolean;
  config?: Partial<ZoomConfig>;
} = {}) {
  /** Element that gets scaled — put the `<video>` inside it. */
  const stageRef = useRef<HTMLDivElement | null>(null);
  /** Optional cursor indicator, positioned in the *unscaled* overlay. */
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<ZoomEngine | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastReadoutAt = useRef(0);

  const [phase, setPhase] = useState<ZoomPhase>("idle");
  const [scale, setScale] = useState(1);

  // Read by the stable `pushEvent` callback, which must not be rebuilt on toggle.
  const enabledRef = useRef(enabled);
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  if (engineRef.current == null) {
    engineRef.current = new ZoomEngine(config);
  }

  // Push config changes into the live engine without recreating it.
  useEffect(() => {
    if (config) engineRef.current?.setConfig(config);
  }, [config]);

  const pushEvent = useCallback((event: CursorEvent) => {
    const engine = engineRef.current;
    if (!engine) return;
    // With zoom off, a click still has to update the cursor position — it just
    // must not raise the zoom target, or every click would pulse for a frame
    // before the loop released it.
    if (event.k === "c" && enabledRef.current) {
      engine.click({ x: event.x, y: event.y, t: event.t });
    } else if (event.k === "c" || event.k === "m") {
      engine.move({ x: event.x, y: event.y, t: event.t });
    } else {
      engine.release();
    }
  }, []);

  const reset = useCallback(() => {
    engineRef.current?.reset();
    const stage = stageRef.current;
    if (stage) {
      stage.style.transform = "scale(1)";
      stage.style.transformOrigin = "50% 50%";
    }
    setPhase("idle");
    setScale(1);
  }, []);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    function frame(now: number) {
      rafRef.current = requestAnimationFrame(frame);
      if (!engine) return;

      // The loop always runs, because it also drives the cursor indicator —
      // showing the host's mouse has nothing to do with whether we're zooming.
      // Disabling zoom just holds the target at 1×; telemetry keeps flowing.
      if (!enabled) engine.release();

      const transform = engine.tick(now);
      const stage = stageRef.current;
      if (stage) {
        const css = transformToCss(transform);
        stage.style.transform = css.transform;
        stage.style.transformOrigin = css.transformOrigin;
        // Markers inside the scaled layer track the pixels correctly but would
        // also get visually fatter with the zoom. Publish the inverse once per
        // frame so they can counter-scale themselves in CSS — one write here
        // instead of a per-marker update.
        stage.style.setProperty(
          "--cinema-inv-scale",
          (1 / transform.scale).toFixed(4),
        );
      }

      const cursor = cursorRef.current;
      if (cursor) {
        const sample = engine.getCursor();
        if (sample) {
          // The indicator lives outside the scaled stage, so map the cursor
          // through the same transform by hand to keep the pointer glued to the
          // pixel it is pointing at.
          const mapped = mapThroughTransform(sample.x, sample.y, transform);
          cursor.style.left = `${(mapped.x * 100).toFixed(3)}%`;
          cursor.style.top = `${(mapped.y * 100).toFixed(3)}%`;
          cursor.style.opacity = "1";
        } else {
          cursor.style.opacity = "0";
        }
      }

      if (now - lastReadoutAt.current > READOUT_INTERVAL_MS) {
        lastReadoutAt.current = now;
        setPhase(engine.getPhase());
        setScale(transform.scale);
      }
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [enabled]);

  return { stageRef, cursorRef, pushEvent, reset, phase, scale };
}
