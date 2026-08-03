"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";

import { readResponseJson } from "@/lib/fetch-json";
import type { Product } from "@/lib/types";

/**
 * What the signed-in viewer has saved, held once for the whole app.
 *
 * Mounted at the root rather than in the `(chrome)` group because two of the
 * three save surfaces — /browse and /show/<slug> — render outside that group.
 *
 * State is seeded with one request on mount instead of being threaded down
 * from each server page: the alternative is passing the same list through four
 * unrelated page trees, which is a lot of plumbing for a set of ids.
 *
 * Every toggle applies optimistically and rolls back if the write fails, so a
 * bookmark never sits filled in over a save that didn't happen.
 */

type SavedContextValue = {
  /** Channel3 product ids. */
  savedItemIds: ReadonlySet<string>;
  /** Show slugs. */
  savedShowSlugs: ReadonlySet<string>;
  /** True once the initial load has settled — buttons stay quiet until then. */
  ready: boolean;
  isSignedIn: boolean;
  toggleItem: (product: Product, sourceSlug?: string | null) => Promise<void>;
  toggleShow: (slug: string) => Promise<void>;
};

const SavedContext = createContext<SavedContextValue | null>(null);

/** Shared empty set, so the signed-out value stays referentially stable. */
const EMPTY: ReadonlySet<string> = new Set();

type SavedItemsResponse = { items?: { product: Product }[] };
type SavedShowsResponse = { shows?: { slug: string }[] };

export function SavedProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  const [savedItemIds, setSavedItemIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [savedShowSlugs, setSavedShowSlugs] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Nothing to fetch when signed out. The sets are also *derived* away
    // below rather than cleared here, so a sign-out can't leave the previous
    // user's saves rendered as filled bookmarks for whoever signs in next.
    if (!isLoaded || !isSignedIn) return;

    let cancelled = false;

    void (async () => {
      try {
        const [itemsRes, showsRes] = await Promise.all([
          fetch("/api/saved/items"),
          fetch("/api/saved/shows"),
        ]);
        const items = await readResponseJson<SavedItemsResponse>(itemsRes);
        const shows = await readResponseJson<SavedShowsResponse>(showsRes);
        if (cancelled) return;
        setSavedItemIds(new Set((items.items ?? []).map((i) => i.product.id)));
        setSavedShowSlugs(new Set((shows.shows ?? []).map((s) => s.slug)));
      } catch {
        // A failed seed leaves every button in its empty state. Saving still
        // works — the write is authoritative and the unique index dedupes.
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn]);

  const toggleItem = useCallback(
    async (product: Product, sourceSlug?: string | null) => {
      if (!isSignedIn || !product.id) return;

      const wasSaved = savedItemIds.has(product.id);
      setSavedItemIds(toggled(savedItemIds, product.id, !wasSaved));

      try {
        const res = await fetch("/api/saved/items", {
          method: wasSaved ? "DELETE" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            wasSaved ? { id: product.id } : { product, sourceSlug },
          ),
        });
        if (!res.ok) throw new Error("save failed");
      } catch {
        setSavedItemIds((current) => toggled(current, product.id, wasSaved));
      }
    },
    [isSignedIn, savedItemIds],
  );

  const toggleShow = useCallback(
    async (slug: string) => {
      if (!isSignedIn || !slug) return;

      const wasSaved = savedShowSlugs.has(slug);
      setSavedShowSlugs(toggled(savedShowSlugs, slug, !wasSaved));

      try {
        const res = await fetch("/api/saved/shows", {
          method: wasSaved ? "DELETE" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug }),
        });
        if (!res.ok) throw new Error("save failed");
      } catch {
        setSavedShowSlugs((current) => toggled(current, slug, wasSaved));
      }
    },
    [isSignedIn, savedShowSlugs],
  );

  const value = useMemo<SavedContextValue>(
    () => ({
      // Signed out, the board reads as empty no matter what a previous
      // session left in state.
      savedItemIds: isSignedIn ? savedItemIds : EMPTY,
      savedShowSlugs: isSignedIn ? savedShowSlugs : EMPTY,
      ready: isLoaded && (!isSignedIn || loaded),
      isSignedIn: Boolean(isSignedIn),
      toggleItem,
      toggleShow,
    }),
    [
      savedItemIds,
      savedShowSlugs,
      isLoaded,
      loaded,
      isSignedIn,
      toggleItem,
      toggleShow,
    ],
  );

  return <SavedContext value={value}>{children}</SavedContext>;
}

/**
 * Null outside the provider rather than throwing: the save button renders in
 * prototype trees under /v2 that don't mount it, and a missing board should
 * hide the button, not break the page.
 */
export function useSaved(): SavedContextValue | null {
  return useContext(SavedContext);
}

function toggled(
  set: ReadonlySet<string>,
  key: string,
  next: boolean,
): ReadonlySet<string> {
  const copy = new Set(set);
  if (next) copy.add(key);
  else copy.delete(key);
  return copy;
}
