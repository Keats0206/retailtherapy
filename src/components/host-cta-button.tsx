"use client";

import Link from "next/link";
import { Radio } from "lucide-react";
import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";
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
  href = "/host/setup",
  area,
  showIcon = false,
  applyLabel = "Apply to host",
  goLiveLabel = "Go live",
  className,
  onClick,
  ...props
}: HostCtaButtonProps) {
  const destination = canHost ? href : "/creators";
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

type ScheduleShowButtonProps = Omit<ComponentProps<typeof Button>, "render"> & {
  canHost: boolean;
  area: string;
};

export function ScheduleShowButton({
  canHost,
  area,
  className,
  onClick,
  ...props
}: ScheduleShowButtonProps) {
  const destination = canHost ? "/host/schedule" : "/creators";
  const label = canHost ? "Schedule show" : "Apply to host";

  return (
    <Button
      {...props}
      variant={props.variant ?? "outline"}
      className={cn(className)}
      render={<Link href={destination} />}
      onClick={(event) => {
        trackEvent(
          canHost ? AnalyticsEvent.CTA_SCHEDULE_SHOW : AnalyticsEvent.CTA_APPLY,
          { area },
        );
        onClick?.(event);
      }}
    >
      {label}
    </Button>
  );
}
