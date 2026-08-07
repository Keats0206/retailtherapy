"use client";

import Link from "next/link";
import { Radio } from "lucide-react";
import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";
import { HOST_CTA } from "@/lib/host-cta-copy";
import { cn } from "@/lib/utils";

type HostCtaButtonProps = Omit<ComponentProps<typeof Button>, "render"> & {
  canHost: boolean;
  /** Override go-live destination (e.g. challenge setup URL). */
  href?: string;
  area: string;
  showIcon?: boolean;
  applyLabel?: string;
  goLiveLabel?: string;
};

export function HostCtaButton({
  canHost,
  href = HOST_CTA.approved.href,
  area,
  showIcon = false,
  applyLabel = HOST_CTA.apply.compactLabel,
  goLiveLabel = HOST_CTA.approved.label,
  className,
  onClick,
  ...props
}: HostCtaButtonProps) {
  const destination = canHost ? href : HOST_CTA.apply.href;
  const label = canHost ? goLiveLabel : applyLabel;

  return (
    <Button
      {...props}
      className={cn(className)}
      render={<Link href={destination} />}
      onClick={(event) => {
        trackEvent(canHost ? AnalyticsEvent.CTA_GO_LIVE : AnalyticsEvent.CTA_APPLY, {
          area,
        });
        onClick?.(event);
      }}
    >
      {showIcon ? <Radio data-icon="inline-start" /> : null}
      {label}
    </Button>
  );
}
