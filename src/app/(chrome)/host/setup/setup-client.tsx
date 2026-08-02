"use client";

import { useLayoutEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { HostOnboarding } from "@/components/host-onboarding";
import {
  readShowSetupDraft,
  type ShowSetupDraft,
  writeShowSetupDraft,
} from "@/lib/show-setup";
import { formatBrief } from "@/lib/challenge-format";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";

/** The event a host arrived from, resolved server-side on the setup route. */
export type SetupChallenge = {
  slug: string;
  title: string;
  prompt: string;
  brandName: string;
  emoji: string | null;
  budget: number;
  currency: string;
  durationSeconds: number | null;
};

export default function HostSetupClient({
  challenge = null,
}: {
  challenge?: SetupChallenge | null;
}) {
  const router = useRouter();
  const [initialDraft, setInitialDraft] = useState<ShowSetupDraft | null | undefined>(
    undefined,
  );

  useLayoutEffect(() => {
    // Client-only draft read — avoids SSR/localStorage hydration mismatch.
    const stored = readShowSetupDraft();
    // Arriving from a challenge card takes precedence over whatever is left in
    // session storage: the host just told us which event they want, and the
    // title is the event's, unless they have already typed their own.
    const seeded: ShowSetupDraft | null = challenge
      ? {
          ...(stored ?? {
            intent: null,
            detail: null,
            items: [],
            showName: "",
            nameTouched: false,
            socials: { instagram: "", tiktok: "", youtube: "" },
            challengeSlug: null,
          }),
          challengeSlug: challenge.slug,
          showName: stored?.nameTouched ? stored.showName : challenge.title,
        }
      : stored;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInitialDraft(seeded);
  }, [challenge]);

  function handleComplete(draft: ShowSetupDraft) {
    writeShowSetupDraft(draft);
    trackEvent(AnalyticsEvent.HOST_SETUP_COMPLETE, {
      area: "host_setup",
      ...(draft.challengeSlug ? { challenge: draft.challengeSlug } : {}),
    });
    router.push("/host");
  }

  if (initialDraft === undefined) {
    return null;
  }

  return (
    <>
      {challenge ? (
        <div className="mx-auto w-full max-w-2xl px-6 pt-6">
          <div className="flex items-start gap-3 rounded-2xl bg-muted/50 p-4 ring-1 ring-foreground/8">
            <span className="text-xl" aria-hidden>
              {challenge.emoji ?? "🛍️"}
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="micro text-muted-foreground">
                {formatBrief(challenge)}
              </span>
              <p className="text-sm leading-relaxed text-foreground">
                {challenge.prompt}
              </p>
            </div>
          </div>
        </div>
      ) : null}
      <HostOnboarding
        key={initialDraft?.intent ?? "new"}
        initialDraft={initialDraft}
        onComplete={handleComplete}
        finishLabel="Continue to studio"
        chrome="live"
      />
    </>
  );
}
