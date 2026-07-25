import { redirect } from "next/navigation";

import { HostLiveBrowser } from "@/components/host-live-browser";
import { WOMENS_CLOTHING_STORES } from "@/lib/shopping-stores";
import { hostNameFromUrl, isValidHttpsUrl } from "@/lib/validate-url";

export default async function HostBrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const { url } = await searchParams;
  if (!url || !isValidHttpsUrl(url)) {
    redirect("/host");
  }

  const storeName =
    WOMENS_CLOTHING_STORES.find((store) => store.url === url)?.name ??
    hostNameFromUrl(url);

  return <HostLiveBrowser storeUrl={url} storeName={storeName} />;
}
