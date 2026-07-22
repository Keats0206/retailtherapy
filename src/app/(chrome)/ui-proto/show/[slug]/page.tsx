import { notFound } from "next/navigation";

import { getMockShow } from "@/lib/mock-home-data";
import ShowView from "./show-view";

export default async function UiProtoShowPage({
  params,
}: PageProps<"/ui-proto/show/[slug]">) {
  const { slug } = await params;
  const show = getMockShow(slug);
  if (!show) notFound();

  return <ShowView show={show} />;
}
