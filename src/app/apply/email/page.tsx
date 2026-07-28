import type { Metadata } from "next";

import { ApplyEmailPage } from "@/components/apply-email-page";

export const metadata: Metadata = {
  title: "Apply to host — frontrow",
  description:
    "Enter your email to finish applying to host live shopping shows on Frontrow.",
};

export default function ApplyEmailRoute() {
  return <ApplyEmailPage />;
}
