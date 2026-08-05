import type { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { saveProfileAction } from "@/app/(chrome)/profile/actions";
import { ProfileSetup } from "@/components/profile-setup";
import { getProfileForUser } from "@/lib/profile";
import { parseProfileSocials } from "@/lib/social-links";

export const metadata: Metadata = {
  title: "Your profile — frontrow",
  description: "Your name, city and social accounts on frontrow.",
};

/** The same form /home shows on first sign-in, reframed for coming back. */
export default async function ProfilePage() {
  const user = await currentUser();
  // The proxy protects this route too; this covers it if that ever loosens.
  if (!user) redirect("/sign-in");

  const profile = await getProfileForUser(user.id);

  return (
    <ProfileSetup
      mode={profile ? "edit" : "onboarding"}
      action={saveProfileAction}
      initialName={profile?.name ?? user.fullName ?? user.firstName ?? ""}
      initialCity={profile?.city ?? ""}
      initialBio={profile?.bio ?? ""}
      initialSocials={parseProfileSocials(profile?.socials)}
    />
  );
}
