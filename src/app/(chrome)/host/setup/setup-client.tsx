"use client";

import { useLayoutEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { HostOnboarding } from "@/components/host-onboarding";
import {
  readShowSetupDraft,
  type ShowSetupDraft,
  writeShowSetupDraft,
} from "@/lib/show-setup";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";

export default function HostSetupClient() {
  const router = useRouter();
  const [initialDraft, setInitialDraft] = useState<ShowSetupDraft | null | undefined>(
    undefined,
  );

  useLayoutEffect(() => {
    setInitialDraft(readShowSetupDraft());
  }, []);

  function handleComplete(draft: ShowSetupDraft) {
    writeShowSetupDraft(draft);
    trackEvent(AnalyticsEvent.HOST_SETUP_COMPLETE, { area: "host_setup" });
    router.push("/host");
  }

  if (initialDraft === undefined) {
    return null;
  }

  return (
    <HostOnboarding
      key={initialDraft?.intent ?? "new"}
      initialDraft={initialDraft}
      onComplete={handleComplete}
      finishLabel="Continue to studio"
      chrome="live"
    />
  );
}
