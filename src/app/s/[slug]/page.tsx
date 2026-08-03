import { redirect } from "next/navigation";

import { viewerShowPath } from "@/lib/show-urls";

export default async function LegacyShowRedirect({
  params,
}: PageProps<"/s/[slug]">) {
  const { slug } = await params;
  redirect(viewerShowPath(slug));
}
