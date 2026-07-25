"use client";

import { useEffect, useState } from "react";
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
  const [initialDraft, setInitialDraft] = useState<ShowSetupDraft | null>(null);
  const [ready, setReady] = useState(false);

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
    return (
      <main className="mx-auto flex min-h-0 w-full max-w-md flex-1 items-center justify-center px-6 py-24">
        <p className="text-sm text-muted-foreground">Loading setup…</p>
      </main>
    );
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
