"use client";

import Link from "next/link";

import { HostCtaBlock } from "@/components/host-cta-block";
import { Button } from "@/components/ui/button";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";

/** Homepage hero CTAs — browse first; host / creator pitch is secondary. */
export function HeroCtaGroup({ canHost = false }: { canHost?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <Button
        size="lg"
        className="bg-foreground px-8 text-background hover:bg-foreground/90"
        render={<Link href="/browse" />}
        onClick={() =>
          trackEvent(AnalyticsEvent.CTA_BROWSE, { area: "hero" })
        }
      >
        Browse shows
      </Button>
      <HostCtaBlock canHost={canHost} area="hero" size="lg" />
    </div>
  );
}
