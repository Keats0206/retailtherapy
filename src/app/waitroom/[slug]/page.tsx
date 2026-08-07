import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";

import { cache } from "react";

import {
  getInterestCount,
  hasUserRegisteredInterest,
} from "@/lib/show-interest";
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

  if (show.status !== "scheduled") {
    redirect(viewerShowPath(slug));
  }

  const { userId } = await auth();
  const [total, registered] = await Promise.all([
    getInterestCount(show.id),
    userId
      ? hasUserRegisteredInterest(show.id, userId)
      : Promise.resolve(false),
  ]);

  return (
    <WaitroomClient
      initialShow={toPublicShow(show)}
      initialInterest={{ total, registered }}
    />
  );
}
