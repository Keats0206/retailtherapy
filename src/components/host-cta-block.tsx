"use client";

import Link from "next/link";
import { Radio } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";
import { HOST_CTA, hostCtaStage } from "@/lib/host-cta-copy";
import { cn } from "@/lib/utils";

type HostCtaBlockProps = {
  canHost: boolean;
  area: string;
  /** Hero-sized button; defaults to compact for inline promos. */
  size?: "lg" | "sm";
  className?: string;
  /** When true, approved hosts get the live chartreuse button. */
  emphasizeApproved?: boolean;
  /** Show the marketing hook under the button. */
  showHook?: boolean;
};

/**
 * Staged go-live / creator-apply CTA with optional marketing hook beneath.
 * Approved hosts see "Go live"; everyone else gets the creator pitch.
 */
export function HostCtaBlock({
  canHost,
  area,
  size = "sm",
  className,
  emphasizeApproved = false,
  showHook = true,
}: HostCtaBlockProps) {
  const stage = hostCtaStage(canHost);
  const copy = HOST_CTA[stage];
  const isApproved = stage === "approved";

  return (
    <div className={cn("flex flex-col items-center gap-2 text-center", className)}>
      <Button
        size={size}
        variant={isApproved && emphasizeApproved ? "live" : isApproved ? "default" : "outline"}
        className={cn(
          size === "lg" && "px-8",
          !isApproved && size === "lg" && "border-foreground/15 bg-background hover:bg-muted",
        )}
        render={<Link href={copy.href} />}
        onClick={() =>
          trackEvent(
            isApproved ? AnalyticsEvent.CTA_GO_LIVE : AnalyticsEvent.CTA_APPLY,
            { area },
          )
        }
      >
        {isApproved ? <Radio data-icon="inline-start" /> : null}
        {copy.label}
      </Button>
      {showHook && copy.hook ? (
        <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
          {copy.hook}
        </p>
      ) : null}
    </div>
  );
}
