"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * The two go-live steps nothing else can observe: whether a store window was
 * opened, and whether the share link was copied. Camera, live and screen-share
 * all have real signals; these two only exist as "the host pressed the button".
 *
 * Kept in a module store rather than component state because the host crosses a
 * tree boundary mid-flow — the pre-show screen unmounts and the LiveKit studio
 * mounts in its place — and a checklist that silently reset at go-live would be
 * worse than no checklist. sessionStorage carries it across an accidental
 * reload, and dies with the tab, which is the right lifetime for one show.
 */

const STORAGE_KEY = "frontrow:go-live-progress";

export type GoLiveProgressState = {
  storeOpened: boolean;
  linkShared: boolean;
};

const EMPTY: GoLiveProgressState = { storeOpened: false, linkShared: false };

let state: GoLiveProgressState | null = null;
const listeners = new Set<() => void>();

function read(): GoLiveProgressState {
  if (state) return state;
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<GoLiveProgressState>) : null;
    state = {
      storeOpened: Boolean(parsed?.storeOpened),
      linkShared: Boolean(parsed?.linkShared),
    };
  } catch {
    state = EMPTY;
  }
  return state;
}

function write(next: GoLiveProgressState) {
  state = next;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private mode / quota — the in-memory copy still drives this tab.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useGoLiveProgress() {
  const value = useSyncExternalStore(subscribe, read, () => EMPTY);

  const markStoreOpened = useCallback(() => {
    if (read().storeOpened) return;
    write({ ...read(), storeOpened: true });
  }, []);

  const markLinkShared = useCallback(() => {
    if (read().linkShared) return;
    write({ ...read(), linkShared: true });
  }, []);

  const reset = useCallback(() => write(EMPTY), []);

  return { ...value, markStoreOpened, markLinkShared, reset };
}
