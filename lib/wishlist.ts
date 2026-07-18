"use client";

import { useSyncExternalStore } from "react";

const KEY = "retail:wishlist";
const listeners = new Set<() => void>();

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

// Cache so getSnapshot returns a stable reference between changes
// (useSyncExternalStore requires referential stability).
let cache: string[] = [];
let cacheRaw: string | null = null;

function currentSnapshot(): string[] {
  if (typeof window === "undefined") return EMPTY;
  const raw = window.localStorage.getItem(KEY);
  if (raw !== cacheRaw) {
    cacheRaw = raw;
    cache = raw ? (JSON.parse(raw) as string[]) : [];
  }
  return cache;
}

const EMPTY: string[] = [];

function write(ids: string[]) {
  window.localStorage.setItem(KEY, JSON.stringify(ids));
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useWishlist(): string[] {
  return useSyncExternalStore(subscribe, currentSnapshot, () => EMPTY);
}

export function toggleWishlist(productId: string) {
  const ids = read();
  const next = ids.includes(productId)
    ? ids.filter((id) => id !== productId)
    : [...ids, productId];
  write(next);
}

export function isWishlisted(productId: string, list: string[]): boolean {
  return list.includes(productId);
}
