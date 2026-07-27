"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { HostOnboarding } from "@/components/host-onboarding";
import { StudioShellSkeleton } from "@/components/show-shell-skeleton";
import {
  readShowSetupDraft,
  type ShowSetupDraft,
  writeShowSetupDraft,
} from "@/lib/show-setup";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";

export default function HostSetupClient() {
  const router = useRouter();
  const [initialDraft, setInitialDraft] = useState<ShowSetupDraft | null>(null);
  const [ready, setReady] = useState(false);

  // sessionStorage is client-only, so the draft can't be read until after
  // hydration. Deferred to a microtask to keep the state updates out of the
  // effect body (react-hooks lint).
  useEffect(() => {
    queueMicrotask(() => {
      setInitialDraft(readShowSetupDraft());
      setReady(true);
    });
  }, []);

  function handleComplete(draft: ShowSetupDraft) {
    writeShowSetupDraft(draft);
    trackEvent(AnalyticsEvent.HOST_SETUP_COMPLETE, { area: "host_setup" });
    router.push("/host");
  }

  if (!ready) {
    return <StudioShellSkeleton statusLabel="Loading setup…" />;
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
