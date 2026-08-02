"use client";

import type { SaveProfileState } from "@/app/(chrome)/profile/actions";
import { ProfileSetup } from "@/components/profile-setup";

/** Pretends to persist: a short pause, then the saved state. */
async function fakeSave(): Promise<SaveProfileState> {
  await new Promise((resolve) => setTimeout(resolve, 600));
  return { status: "saved", savedAt: Date.now() };
}

/**
 * Prototype wrapper — the exact form /home shows a fresh signup, minus the
 * database: saving fakes success, and the bottom CTAs stay inside /prototype.
 */
export default function PrototypeProfileClient() {
  return (
    <ProfileSetup
      action={fakeSave}
      initialName="Leon Mueller"
      browseHref="/prototype/browse"
      hostHref="/prototype/onboarding"
    />
  );
}
