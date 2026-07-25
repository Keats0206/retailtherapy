import type { Metadata } from "next";

import { ApplyConfirmedPage } from "@/components/apply-confirmed-page";

export const metadata: Metadata = {
  title: "Application received — frontrow",
  description:
    "Your application to become a creator on Frontrow has been received.",
};

export default function ApplyConfirmedRoute() {
  return <ApplyConfirmedPage />;
}
