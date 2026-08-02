"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";
import { openStoreWindow } from "@/lib/open-store-window";
import { WOMENS_CLOTHING_STORES } from "@/lib/shopping-stores";
import { hostNameFromUrl } from "@/lib/validate-url";
import { cn } from "@/lib/utils";

export type ChallengeStore = {
  url: string;
  brandName: string;
};

/**
 * Step one of going live: get a store open in its own Chrome window, which is
 * the surface the host then shares.
 *
 * Every store lands in that same window (see `openStoreWindow`) so the host
 * picks the share surface once and can keep shopping inside it.
 *
 * A host who arrived from a challenge gets that brand's store as the single
 * primary button. They already chose where to shop; making them find it again
 * in a generic list is the wrong question to ask at this moment.
 */
function openStore(url: string, label: string, onOpened?: () => void) {
  trackEvent(AnalyticsEvent.HOST_PIP_STORE_CLICK, { store: label });
  openStoreWindow(url);
  onOpened?.();
}

export function StoreLauncher({
  challengeStore,
  onOpened,
  className,
}: {
  challengeStore?: ChallengeStore | null;
  /** Fired on any successful open, so the caller can tick the step. */
  onOpened?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {challengeStore ? (
        <>
          <Button
            type="button"
            className="w-fit gap-2"
            onClick={() =>
              openStore(challengeStore.url, challengeStore.brandName, onOpened)
            }
          >
            <Store className="size-4" />
            Open {challengeStore.brandName}
            <span className="font-normal opacity-70">
              {hostNameFromUrl(challengeStore.url)}
            </span>
          </Button>
          <span className="micro text-muted-foreground">
            Opens in your shopping window. More stores under Store ideas,
            bottom right.
          </span>
        </>
      ) : (
        // No challenge brand, so there's nothing to open blind — the host picks
        // from the list right here instead of being sent somewhere first.
        <>
          <StoreIdeasMenu
            onOpened={onOpened}
            label="Open a store"
            variant="default"
            size="default"
            placement="down"
            className="w-fit"
          />
          <span className="micro text-muted-foreground">
            Opens in your shopping window — share that window once, then switch
            stores inside it.
          </span>
        </>
      )}
    </div>
  );
}

/**
 * The curated list, parked out of the way. It's a browsing aid, not a step —
 * the host only wants it when they don't already know where they're shopping,
 * so it collapses into one button instead of taking up console space.
 */
export function StoreIdeasMenu({
  onOpened,
  className,
  label = "Store ideas",
  variant = "outline",
  size = "sm",
  placement = "up",
}: {
  onOpened?: () => void;
  className?: string;
  label?: string;
  variant?: "default" | "outline";
  size?: "sm" | "default";
  placement?: "up" | "down";
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Button
        type="button"
        variant={variant}
        size={size}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className="gap-1.5"
      >
        <Store className={size === "sm" ? "size-3.5" : "size-4"} />
        {label}
      </Button>

      {open ? (
        <ul
          role="menu"
          className={cn(
            "absolute z-50 max-h-80 w-56 overflow-y-auto border border-border bg-background p-1 shadow-lg",
            placement === "up"
              ? "bottom-full right-0 mb-2"
              : "top-full left-0 mt-2",
          )}
        >
          {WOMENS_CLOTHING_STORES.map((store) => (
            <li key={store.url}>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  openStore(store.url, store.name, onOpened);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-foreground/8"
              >
                <span className="truncate">{store.name}</span>
                <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
