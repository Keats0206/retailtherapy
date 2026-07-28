"use client";

import { useRouter } from "next/navigation";

import { HostOnboarding } from "@/components/host-onboarding";

/**
 * Prototype wrapper — same UI as production /host/setup, but finishes into
 * the in-memory creator studio instead of persisting a real show.
 */
export default function OnboardingClient() {
  const router = useRouter();

  return (
    <HostOnboarding
      chrome="prototype"
      finishLabel="Start the show"
      onComplete={() => {
        router.push("/prototype?view=creator");
      }}
    />
  );
}
