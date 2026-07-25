import { notFound } from "next/navigation";

import { createAccessToken, getLiveKitConfig } from "@/lib/livekit";
import { getShowBySlug } from "@/lib/shows";
import { toPublicShow } from "@/lib/show-public";

import ShowPageClient from "./show-page-client";

export default async function ShowPage({
  params,
}: PageProps<"/s/[slug]">) {
  const { slug } = await params;
  const show = await getShowBySlug(slug);
  if (!show) notFound();

  let liveConnection: { token: string; url: string } | null = null;
  if (show.status === "live") {
    try {
      const identity = `viewer-${crypto.randomUUID().slice(0, 8)}`;
      const token = await createAccessToken({
        room: show.roomName,
        identity,
        name: "Viewer",
        canPublish: false,
      });
      const { url } = getLiveKitConfig();
      liveConnection = { token, url };
    } catch {
      // Client falls back to POST /api/livekit/token if minting fails.
    }
  }

  return (
    <ShowPageClient
      initialShow={toPublicShow(show)}
      liveConnection={liveConnection}
    />
  );
}
