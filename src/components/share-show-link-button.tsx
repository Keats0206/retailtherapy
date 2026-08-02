"use client";

import { useState } from "react";
import { Check, Link2, Share2 } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";

type ShareShowLinkButtonProps = {
  slug: string;
  className?: string;
  size?: VariantProps<typeof buttonVariants>["size"];
  variant?: VariantProps<typeof buttonVariants>["variant"];
  showPath?: boolean;
  /** Compact icon-only style for stage overlay */
  compact?: boolean;
  /** Fired once the link actually reached the clipboard. */
  onShared?: () => void;
};

export function ShareShowLinkButton({
  slug,
  className,
  size = "lg",
  variant = "outline",
  showPath = false,
  compact = false,
  onShared,
}: ShareShowLinkButtonProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const sharePath = `/s/${slug}`;

  async function shareLink() {
    setCopyError(false);
    const url = `${window.location.origin}${sharePath}`;
    try {
      await navigator.clipboard.writeText(url);
      trackEvent(AnalyticsEvent.HOST_SHARE_LINK, { area: "host_studio" });
      onShared?.();
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError(true);
      window.setTimeout(() => setCopyError(false), 3000);
    }
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => void shareLink()}
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-full bg-black/50 px-3 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/70",
          className,
        )}
      >
        {copied ? (
          <>
            <Check className="size-3.5" />
            Copied!
          </>
        ) : copyError ? (
          <>
            <Share2 className="size-3.5" />
            Copy failed
          </>
        ) : (
          <>
            <Share2 className="size-3.5" />
            Share the show
          </>
        )}
      </button>
    );
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn("gap-2", className)}
      onClick={() => void shareLink()}
    >
      {copied ? <Link2 /> : <Share2 />}
      <span>
        {copied ? "Link copied!" : copyError ? "Copy failed" : "Share show link"}
      </span>
      {showPath ? (
        <span className="hidden font-normal text-muted-foreground sm:inline">
          {sharePath}
        </span>
      ) : null}
    </Button>
  );
}
