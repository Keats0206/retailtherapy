"use client";

import { useCallback, useState, type SyntheticEvent } from "react";
import { ExternalLink } from "lucide-react";

import {
  useCaptureHandle,
  useLiveShareSession,
} from "@/hooks/use-live-share-session";
import { hostNameFromUrl } from "@/lib/validate-url";
import { cn } from "@/lib/utils";

export function HostLiveBrowser({
  storeUrl,
  storeName,
}: {
  storeUrl: string;
  storeName?: string;
}) {
  const host = storeName ?? hostNameFromUrl(storeUrl);
  const session = useLiveShareSession();
  const [iframeBlocked, setIframeBlocked] = useState(false);

  const isLive = session.live && Boolean(session.slug);
  const isCaptured =
    session.sharing &&
    Boolean(session.captureHandle) &&
    session.captureHandle === session.slug;

  useCaptureHandle(session.slug || null, isLive);

  const markBlocked = useCallback(() => setIframeBlocked(true), []);

  return (
    <div
      className={cn(
        "live-share-frame flex h-full min-h-0 flex-col",
        isLive && "live-share-frame--live",
        isCaptured && "live-share-frame--captured",
      )}
    >
      <header className="live-share-frame-bar flex shrink-0 items-center justify-between gap-3 px-4 py-2.5">
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
          <p className="truncate text-sm text-foreground/90">
            {isCaptured
              ? "Viewers see this window"
              : isLive
                ? "Share this window when you go live"
                : "Open while hosting to get the live border"}
          </p>
        </div>
        <a
          href={storeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="micro inline-flex shrink-0 items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          {host}
          <ExternalLink className="size-3" />
        </a>
      </header>

      <div className="relative min-h-0 flex-1 bg-background">
        {!iframeBlocked ? (
          // credentialless can load some sites that block ordinary embeds.
          <iframe
            src={storeUrl}
            title={host}
            credentialless
            className="h-full w-full border-0"
            onError={markBlocked}
            onLoad={(event: SyntheticEvent<HTMLIFrameElement>) => {
              const frame = event.currentTarget;
              try {
                const doc = frame.contentDocument;
                if (!doc) return;
                const href = doc.location.href;
                if (href === "about:blank" || href.startsWith("about:")) {
                  markBlocked();
                }
              } catch {
                // Cross-origin load — treat as success.
              }
            }}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              {host} can&apos;t load inside Frontrow. Open it directly, then
              share that tab — Chrome will show its own sharing indicator.
            </p>
            <a
              href={storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
            >
              Open {host}
              <ExternalLink className="size-4" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
