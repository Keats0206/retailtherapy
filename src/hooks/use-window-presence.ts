"use client";

import { useEffect, useState } from "react";

function readPresence(): boolean {
  if (typeof document === "undefined") return true;
  return document.visibilityState === "visible" && document.hasFocus();
}

/**
 * True when this tab is the one the user is actually looking at.
 *
 * Visibility alone isn't enough: `visibilitychange` doesn't fire when the user
 * switches to another Chrome *window* — which is exactly what a host does when
 * they click into the store window they're sharing. Focus catches that case,
 * visibility catches tab switches and minimising, so the pair covers both.
 */
export function useWindowPresence(): boolean {
  // Start optimistic so SSR and first paint agree; the effect syncs the truth.
  const [present, setPresent] = useState(true);

  useEffect(() => {
    function sync() {
      setPresent(readPresence());
    }

    sync();

    window.addEventListener("focus", sync);
    window.addEventListener("blur", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      window.removeEventListener("focus", sync);
      window.removeEventListener("blur", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  return present;
}
