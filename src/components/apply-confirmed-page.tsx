"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { ApplyPageChrome } from "@/components/apply-page-chrome";
import { Button } from "@/components/ui/button";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";
import { clearWaitlistDraft } from "@/lib/waitlist-draft";

export function ApplyConfirmedPage() {
  useEffect(() => {
    clearWaitlistDraft();
  }, []);

  return (
    <ApplyPageChrome>
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="flex max-w-md flex-col items-center gap-6 text-center">
          <CheckCircle2 className="size-12 text-live" strokeWidth={1.5} />
          <div className="flex flex-col gap-2">
            <span className="micro text-live">Application received</span>
            <h1 className="text-3xl font-normal tracking-tight sm:text-4xl">
              We&rsquo;ll be in touch
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Thanks for applying to become a creator on Frontrow. We review
              every application and will reach out by email when a spot opens up.
            </p>
          </div>
          <Button
            variant="outline"
            size="micro"
            render={<Link href="/browse" />}
            onClick={() =>
              trackEvent(AnalyticsEvent.APPLY_CONFIRMED, { area: "apply" })
            }
          >
            Browse live shows
          </Button>
        </div>
      </main>
    </ApplyPageChrome>
  );
}
