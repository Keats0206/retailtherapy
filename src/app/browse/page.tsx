import type { Metadata } from "next";

import { BrowsePage } from "@/components/browse-page";
import { listLiveShows } from "@/lib/shows";

export const metadata: Metadata = {
  title: "Browse live shows — frontrow",
  description:
    "Live shopping shows happening now. Join the room, vote on what you'd buy, and shop along while hosts show what they're buying.",
};

export default async function BrowseRoute() {
  const liveShows = await listLiveShows();

  return <BrowsePage liveShows={liveShows} />;
}
