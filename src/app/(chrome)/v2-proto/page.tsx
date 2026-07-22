import { redirect } from "next/navigation";

/**
 * /v2-proto merged into /prototype. Keeps old bookmarks working.
 */
export default async function V2ProtoPage({
  searchParams,
}: PageProps<"/v2-proto">) {
  const { view } = await searchParams;
  const params = view ? `?view=${view}` : "";
  redirect(`/prototype${params}`);
}
