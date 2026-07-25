"use client";

import { ExternalLink } from "lucide-react";

import { AnalyticsEvent, trackEvent } from "@/lib/analytics";
import { WOMENS_CLOTHING_STORES } from "@/lib/shopping-stores";
import { cn } from "@/lib/utils";

export function PipStoreSuggestions({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        "w-full rounded-xl bg-muted/40 p-5 text-left ring-1 ring-foreground/8",
        className,
      )}
    >
      <h2 className="text-sm font-medium text-foreground">
        Open a store to shop live
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        Open a live shopping window, share it in the picker, then paste product
        links into the floating studio. The window gets a chartreuse border while
        you&apos;re live.
      </p>

      <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {WOMENS_CLOTHING_STORES.map((store) => (
          <li key={store.url}>
            <a
              href={`/host/browse?url=${encodeURIComponent(store.url)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                trackEvent(AnalyticsEvent.HOST_PIP_STORE_CLICK, {
                  store: store.name,
                })
              }
              className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background/60"
            >
              <span>{store.name}</span>
              <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
