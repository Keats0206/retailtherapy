import { getHostUser } from "@/lib/auth";
import { isChannel3Configured } from "@/lib/channel3";
import HostClient from "./host-client";

// Server gate: proxy.ts requires a signed-in user to reach /host.
export default async function HostPage() {
  const host = await getHostUser();
  if (!host) return null;

  const hostName =
    host.username ??
    [host.firstName, host.lastName].filter(Boolean).join(" ") ??
    null;

  return (
    <HostClient
      hostName={hostName}
      channel3Configured={isChannel3Configured()}
    />
  );
}
