"use client";

import { ExternalLink } from "lucide-react";

import { AnalyticsEvent, trackEvent } from "@/lib/analytics";
import { WOMENS_CLOTHING_STORES } from "@/lib/shopping-stores";
import { cn } from "@/lib/utils";

function openStoreWindow(url: string) {
  const width = Math.min(1280, window.screen.availWidth - 80);
  const height = Math.min(900, window.screen.availHeight - 80);
  const left = Math.round((window.screen.availWidth - width) / 2);
  const top = Math.round((window.screen.availHeight - height) / 2);
  const features = [
    `width=${width}`,
    `height=${height}`,
    `left=${left}`,
    `top=${top}`,
    "noopener",
    "noreferrer",
  ].join(",");

  window.open(url, "_blank", features);
}

export function PipStoreSuggestions({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        "w-full rounded-xl bg-muted/40 p-4 text-left ring-1 ring-foreground/8",
        className,
      )}
    >
      <h2 className="text-sm font-medium text-foreground">
        1. Pick a store
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Opens in a new window — share it when you go live.
      </p>

      <ul className="mt-3 grid grid-cols-2 gap-1 sm:grid-cols-2">
        {WOMENS_CLOTHING_STORES.map((store) => (
          <li key={store.url}>
            <button
              type="button"
              onClick={() => {
                trackEvent(AnalyticsEvent.HOST_PIP_STORE_CLICK, {
                  store: store.name,
                });
                openStoreWindow(store.url);
              }}
              className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-background/60"
            >
              <span>{store.name}</span>
              <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
