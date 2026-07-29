"use client";

import { ExternalLink } from "lucide-react";

import { useLiveShareSession } from "@/hooks/use-live-share-session";
import { WOMENS_CLOTHING_STORES } from "@/lib/shopping-stores";
import { cn } from "@/lib/utils";

export function HostShoppingLauncher() {
  const session = useLiveShareSession();
  const isLive = session.live && Boolean(session.slug);

  return (
    <div
      className={cn(
        "live-share-frame flex min-h-screen flex-col bg-background",
        isLive && "live-share-frame--live",
      )}
    >
      <header className="live-share-frame-bar flex shrink-0 flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          {isLive ? (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-live px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-live-foreground">
              <span className="size-1.5 animate-pulse rounded-full bg-live-foreground/80" />
              Live
            </span>
          ) : (
            <span className="micro shrink-0 text-muted-foreground">
              Shopping window
            </span>
          )}
          <p className="text-sm text-foreground/90">
            {isLive
              ? "Open stores as tabs here — share this Chrome window in Frontrow"
              : "Open stores as tabs here while you get ready"}
          </p>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-4 px-4 py-6 sm:px-6">
        <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
          Each store opens in a new tab in this window. Back in Frontrow, share{" "}
          <strong className="font-medium text-foreground">Window</strong> (not
          Tab) so viewers follow as you switch stores.
        </p>

        <ul className="grid grid-cols-2 gap-2 sm:max-w-md">
          {WOMENS_CLOTHING_STORES.map((store) => (
            <li key={store.url}>
              <a
                href={store.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2.5 text-sm font-medium text-foreground ring-1 ring-foreground/8 transition-colors hover:bg-muted/70"
              >
                <span>{store.name}</span>
                <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
              </a>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
