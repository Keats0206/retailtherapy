import { notFound } from "next/navigation";

import { getShowBySlug } from "@/lib/shows";
import { toPublicShow } from "@/lib/show-public";

import ShowPageClient from "./show-page-client";

export default async function ShowPage({
  params,
}: PageProps<"/s/[slug]">) {
  const { slug } = await params;
  const show = await getShowBySlug(slug);
  if (!show) notFound();

  return (
    <ShowPageClient initialShow={toPublicShow(show)} />
  );
}
