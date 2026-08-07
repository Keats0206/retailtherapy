import { redirect } from "next/navigation";

import { parseRange } from "@/lib/metrics";

export default async function AdminMetricsRedirect({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const range = parseRange(params.range);
  redirect(`/admin?tab=metrics&range=${range}`);
}
