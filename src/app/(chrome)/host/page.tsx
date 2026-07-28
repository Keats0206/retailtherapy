import { getSignedInUser } from "@/lib/auth";
import { isChannel3Configured } from "@/lib/channel3";
import { getLiveShowForHost } from "@/lib/shows";
import HostClient from "./host-client";

// Server gate: proxy.ts requires a signed-in user to reach /host.
export default async function HostPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string }>;
}) {
  const user = await getSignedInUser();
  if (!user) return null;

  const { slug: resumeSlug } = await searchParams;

  const hostName =
    user.username ??
    [user.firstName, user.lastName].filter(Boolean).join(" ") ??
    null;

  const liveShow = await getLiveShowForHost(user.id);

  return (
    <HostClient
      hostName={hostName}
      channel3Configured={isChannel3Configured()}
      resumeSlug={resumeSlug ?? null}
      liveShowSlug={liveShow?.slug ?? null}
      liveShowTitle={liveShow?.title ?? null}
    />
  );
}
