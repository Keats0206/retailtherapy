import type { Metadata } from "next";

import { ApplyHostPage } from "@/components/apply-host-page";

export const metadata: Metadata = {
  title: "Host waitlist — frontrow",
  description:
    "Join the waitlist to host live shopping shows on Frontrow. See what creators might earn based on audience size and go live from your browser.",
};

export default function ApplyRoute() {
  return <ApplyHostPage />;
}
