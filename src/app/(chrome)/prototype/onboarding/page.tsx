import OnboardingClient from "./onboarding-client";

export const metadata = {
  title: "creator onboarding · prototype — frontrow",
};

/**
 * Creator onboarding, prototype edition. Shares UI with production
 * `/host/setup`, but finishes into the in-memory creator studio — nothing is
 * persisted. Prefer `/host/setup` for the connected go-live path.
 */
export default function OnboardingPage() {
  return <OnboardingClient />;
}
