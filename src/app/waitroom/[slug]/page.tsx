import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { cache } from "react";

import { getShowBySlug } from "@/lib/shows";
import { toPublicShow } from "@/lib/show-public";
import { viewerShowPath } from "@/lib/show-urls";

import WaitroomClient from "./waitroom-client";

const getShowBySlugCached = cache(getShowBySlug);

export async function generateMetadata({
  params,
}: PageProps<"/waitroom/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const show = await getShowBySlugCached(slug);
  if (!show) return { title: "Waitroom" };
  return {
    title: `${show.title} — starting soon`,
    description: `${show.hostName ?? "The host"} is about to go live.`,
  };
}

export default async function WaitroomPage({
  params,
}: PageProps<"/waitroom/[slug]">) {
  const { slug } = await params;
  const show = await getShowBySlugCached(slug);
  if (!show) notFound();

  // The waitroom is only for a show that hasn't started. Once it's live (or
  // over, and playing back its replay), the show itself lives at /show/<slug>.
  if (show.status !== "scheduled") {
    redirect(viewerShowPath(slug));
  }

  return <WaitroomClient initialShow={toPublicShow(show)} />;
}
