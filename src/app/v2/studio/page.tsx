import type { Metadata } from "next";

import { StudioClient } from "@/app/v2/studio/studio-client";

export const metadata: Metadata = {
  title: "Cinema studio prototype — frontrow",
  description:
    "Prototype of the auto-zoom broadcast composition: screen share, floating head bubble, and click-driven zoom, shown from both the host and viewer side.",
};

export default function StudioPrototypePage() {
  return <StudioClient />;
}
