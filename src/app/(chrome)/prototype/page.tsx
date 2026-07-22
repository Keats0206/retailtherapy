import PrototypeClient, { type View } from "@/components/prototype-client";

/**
 * A no-dependency sandbox for both sides of the app. Renders the same studio
 * and watch layouts /host and /watch use, against in-memory state — so you can
 * iterate on either experience without a LiveKit room, a camera, an allowlisted
 * Clerk account, or a Channel3 key.
 *
 * Reading the initial pane from `?view=` here (rather than `useSearchParams` in
 * the client) keeps the toggle out of a Suspense boundary; the client then
 * updates the URL with `history.replaceState`, which costs no round trip.
 */
export default async function PrototypePage({
  searchParams,
}: PageProps<"/prototype">) {
  const { view } = await searchParams;
  const initialView: View = view === "consumer" ? "consumer" : "creator";

  return <PrototypeClient initialView={initialView} />;
}
