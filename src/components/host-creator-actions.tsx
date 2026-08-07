"use client";

import Link from "next/link";
import { CalendarClock, Radio } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";
import { HOST_CTA } from "@/lib/host-cta-copy";

export function HostCreatorActions({ area }: { area: string }) {
  return (
    <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
      <Button
        size="sm"
        variant="live"
        className="gap-1.5"
        render={<Link href={HOST_CTA.approved.href} />}
        onClick={() =>
          trackEvent(AnalyticsEvent.CTA_GO_LIVE, { area })
        }
      >
        <Radio data-icon="inline-start" />
        {HOST_CTA.approved.label}
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="gap-1.5"
        render={<Link href={HOST_CTA.schedule.href} />}
        onClick={() =>
          trackEvent(AnalyticsEvent.CTA_SCHEDULE_SHOW, { area })
        }
      >
        <CalendarClock data-icon="inline-start" />
        {HOST_CTA.schedule.label}
      </Button>
    </div>
  );
}
