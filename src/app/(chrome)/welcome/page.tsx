import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { WelcomeOnboarding } from "@/components/welcome-onboarding";
import { getSignedInUser } from "@/lib/auth";
import { hasOnboarded } from "@/lib/onboarding";

export const metadata: Metadata = {
  title: "frontrow — welcome",
  description: "Tell us what you're shopping for.",
};

/**
 * First-run onboarding. Lives in the (chrome) group rather than (app) so it
 * gets the wordmark and none of the sidebar — nothing to navigate to yet.
 */
export default async function WelcomePage() {
  const user = await getSignedInUser();
  if (!user) redirect("/sign-in");
  // Onboarding runs once. A bookmark should not offer a second pass.
  if (hasOnboarded(user)) redirect("/browse");

  return <WelcomeOnboarding firstName={user.firstName} />;
}
