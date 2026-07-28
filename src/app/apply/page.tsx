import type { Metadata } from "next";

import { ApplyHostPage } from "@/components/apply-host-page";

export const metadata: Metadata = {
  title: "Apply to host — frontrow",
  description:
    "Apply to host live shopping shows on Frontrow. Share your socials and we'll reach out as creator spots open up.",
};

export default function ApplyRoute() {
  return <ApplyHostPage />;
}
