const STORE_WINDOW_NAME = "frontrow-shopping";

let storeWindowRef: Window | null = null;

/**
 * Opens a store in the host's dedicated shopping window, reusing the same OS
 * window every time.
 *
 * Why reuse rather than a fresh window per store: the host shares **Window**
 * once, and the screen share is bound to that OS window. Navigating inside it
 * keeps the share alive, so switching stores mid-show never makes the host
 * re-pick the share surface.
 *
 * Stores replace each other rather than stacking as tabs. Tabs would need a
 * page of ours living in that window to call `open()` from — a cross-origin
 * window reference doesn't expose `open` — and that page is exactly the
 * interstitial we removed.
 *
 * Deliberately no `noopener`: it makes `window.open` return null and forces a
 * fresh context, which would defeat the reuse this whole function exists for.
 * The tradeoff is that these (curated, well-known) retailers can see
 * `window.opener`.
 */
export function openStoreWindow(url: string): Window | null {
  if (typeof window === "undefined") return null;

  if (storeWindowRef && !storeWindowRef.closed) {
    try {
      // Cross-origin windows still accept a location write and a focus call,
      // which is all the reuse path needs.
      storeWindowRef.location.href = url;
      storeWindowRef.focus();
      return storeWindowRef;
    } catch {
      // Blocked for some reason — fall through and open a fresh window.
      storeWindowRef = null;
    }
  }

  storeWindowRef = window.open(url, STORE_WINDOW_NAME);
  return storeWindowRef;
}
