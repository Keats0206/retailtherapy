import { notFound } from "next/navigation";

import { getShowBySlug, resolveRecording } from "@/lib/shows";
import { toPublicShow } from "@/lib/show-public";

import ShowPageClient from "./show-page-client";

export default async function ShowPage({
  params,
}: PageProps<"/s/[slug]">) {
  const { slug } = await params;
  let show = await getShowBySlug(slug);
  if (!show) notFound();

  if (show.status === "ended") {
    show = await resolveRecording(show);
  }

  return <ShowPageClient initialShow={toPublicShow(show)} />;
}
