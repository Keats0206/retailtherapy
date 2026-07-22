/**
 * Prototype-only broadcast of show lifecycle across tabs. When the host ends a
 * show in /ui-proto/go-live, open viewer tabs on /ui-proto/show/[slug] pick up
 * the ended state via storage events.
 */

import type { EndedShowRecap } from "@/lib/show-recap";

export type { EndedShowRecap };

const KEY_PREFIX = "retailtherapy:show-ended:";

function storageKey(slug: string) {
  return `${KEY_PREFIX}${slug}`;
}

export function markShowEnded(recap: EndedShowRecap) {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(recap.slug), JSON.stringify(recap));
}

export function getShowEnded(slug: string): EndedShowRecap | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(storageKey(slug));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as EndedShowRecap;
  } catch {
    return null;
  }
}

export function clearShowEnded(slug: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(storageKey(slug));
}

/** React hook helper — subscribe to ended-state changes for a slug. */
export function subscribeShowEnded(
  slug: string,
  onChange: (recap: EndedShowRecap | null) => void,
) {
  if (typeof window === "undefined") return () => {};

  function read() {
    onChange(getShowEnded(slug));
  }

  read();

  function onStorage(e: StorageEvent) {
    if (e.key === storageKey(slug)) read();
  }

  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}
