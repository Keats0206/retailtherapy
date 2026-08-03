import type { Metadata } from "next";

import { CreatorWaitlistPage } from "@/components/creator-waitlist-page";

export const metadata: Metadata = {
  title: "Creators — frontrow",
  description:
    "Get paid to shop. Brands pay you to livestream on frontrow — apply to host from your browser.",
};

export default function CreatorsRoute() {
  return <CreatorWaitlistPage />;
}
