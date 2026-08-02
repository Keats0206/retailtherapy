import type { Metadata } from "next";

import { StreamFlowClient } from "./stream-flow-client";

export const metadata: Metadata = {
  title: "Stream flow · prototype — frontrow",
  description:
    "Prototype of a streamlined go-live: pick the store you're shopping, tap once, and the stream and screen share happen together.",
};

/**
 * Deliberately outside the `(chrome)` group — the live studio runs full-bleed
 * like `/watch`, and this prototype carries its own header.
 */
export default function StreamFlowPage() {
  return <StreamFlowClient />;
}
