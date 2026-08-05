import { BrowsePagePrototype } from "@/components/browse-page-prototype";

export const metadata = {
  title: "browse · prototype — frontrow",
};

/**
 * Browse, prototype edition. The production /browse layout plus the concepts
 * under review — the Upcoming schedule, the notify/host empty state, and the
 * signed-out join gate — on canned data, so it renders without a database.
 * Prefer /browse for real shows.
 */
export default function BrowsePrototypePage() {
  return <BrowsePagePrototype />;
}
