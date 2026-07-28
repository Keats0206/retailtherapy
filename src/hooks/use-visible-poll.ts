"use client";

import { useEffect, useRef } from "react";

/**
 * Runs `task` on an interval, but only while the tab is actually being looked
 * at.
 *
 * Three things every poller in this app wants and none of them had:
 *
 *   - **Paused while hidden.** A backgrounded tab used to keep hitting the API
 *     forever. Browsers throttle background timers but do not stop them, and a
 *     viewer who leaves a finished show open in another tab should cost nothing.
 *   - **Catch-up on return.** Refocusing fires one immediate run, so the UI is
 *     current before the next interval lands rather than up to `intervalMs`
 *     stale.
 *   - **No overlap.** A response slower than the interval would otherwise stack
 *     up a queue of in-flight requests.
 *
 * `task` is held in a ref, so callers do not need to memoize it — only
 * `intervalMs` and `enabled` restart the timer.
 */
export function useVisiblePoll(
  task: () => void | Promise<void>,
  intervalMs: number,
  enabled = true,
) {
  const taskRef = useRef(task);
  useEffect(() => {
    taskRef.current = task;
  }, [task]);

  useEffect(() => {
    if (!enabled) return;

    let inFlight = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    function run() {
      if (inFlight) return;
      inFlight = true;
      void Promise.resolve(taskRef.current()).finally(() => {
        inFlight = false;
      });
    }

    function start() {
      if (timer !== null) return;
      timer = setInterval(run, intervalMs);
    }

    function stop() {
      if (timer === null) return;
      clearInterval(timer);
      timer = null;
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        run();
        start();
      } else {
        stop();
      }
    }

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [enabled, intervalMs]);
}
