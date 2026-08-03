"use client";

import { MonitorUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ShareShowLinkButton } from "@/components/share-show-link-button";
import type { ShareDisplaySurface } from "@/lib/screen-share-surface";
import { cn } from "@/lib/utils";

export function ShareSurfaceBanner({
  surface,
  slug,
  onReshare,
  className,
}: {
  surface: ShareDisplaySurface | undefined;
  slug: string;
  onReshare?: () => void;
  className?: string;
}) {
  if (!surface) return null;

  if (surface === "window") {
    return (
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 border-b border-live/30 bg-live/10 px-4 py-2 text-sm text-foreground",
          className,
        )}
        role="status"
      >
        <p>
          Viewers see your shopping window — switch tabs freely while you shop.
        </p>
        <ShareShowLinkButton
          slug={slug}
          size="sm"
          className="shrink-0 rounded-full"
        />
      </div>
    );
  }

  if (surface === "browser") {
    return (
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-foreground",
          className,
        )}
        role="alert"
      >
        <p>
          You shared a single tab. Share again and pick{" "}
          <strong className="font-medium">Window</strong> to switch between
          stores.
        </p>
        {onReshare ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 rounded-full"
            onClick={onReshare}
          >
            <MonitorUp className="size-4" />
            Share again
          </Button>
        ) : null}
      </div>
    );
  }

  return null;
}
