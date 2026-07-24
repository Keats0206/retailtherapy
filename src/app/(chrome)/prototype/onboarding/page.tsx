import OnboardingClient from "./onboarding-client";

export const metadata = {
  title: "creator onboarding · prototype — frontrow",
};

/**
 * Creator onboarding, prototype edition. Establishes what the show is shopping
 * for (a season, an event, or just browsing), builds the item list, and names
 * the show — with the "AI" suggestion mocked locally. Like /prototype, it runs
 * on in-memory state only: nothing is saved, no APIs are called.
 */
export default function OnboardingPage() {
  return <OnboardingClient />;
}
