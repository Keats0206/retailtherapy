"use client";

import { Check, Loader2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * What is still happening after the host stops broadcasting.
 *
 * Ending a show looks instant and isn't: the recap page is up immediately, but
 * Mux is still packaging the recording behind it. Without this the host sees
 * "Recording processing" on a black rectangle and reasonably concludes it
 * failed. Naming the one outstanding step — and showing the finished ones —
 * turns a broken-looking page into a page that is working.
 *
 * The recording row is driven by `muxPlaybackId` arriving on the poll in
 * `HostRecapClient`, so it ticks over on its own without a reload.
 */
export function PostShowProcessing({
  trailCount,
  recordingReady,
  className,
}: {
  trailCount: number;
  recordingReady: boolean;
  className?: string;
}) {
  const steps = [
    { label: "Broadcast stopped", done: true, pending: null },
    {
      label:
        trailCount > 0
          ? `Shopping trail saved — ${trailCount} ${trailCount === 1 ? "item" : "items"}`
          : "Shopping trail saved",
      done: true,
      pending: null,
    },
    { label: "Recap page published for viewers", done: true, pending: null },
    {
      label: "Recording packaged",
      done: recordingReady,
      pending: "Packaging recording — usually a few minutes",
    },
  ];

  const outstanding = steps.filter((step) => !step.done).length;

  return (
    <Card size="sm" className={className}>
      <CardHeader>
        <CardTitle className="text-base">
          {outstanding === 0 ? "Everything's saved" : "Wrapping up your show"}
        </CardTitle>
        <CardDescription>
          {outstanding === 0
            ? "Your recap is complete — the replay is live on the share link."
            : "Your recap is already live. You can close this page; the rest finishes without you."}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <ul className="flex flex-col gap-2.5">
          {steps.map((step) => (
            <li key={step.label} className="flex items-center gap-2.5 text-sm">
              {step.done ? (
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-live/15 text-live">
                  <Check className="size-3" />
                </span>
              ) : (
                <Loader2 className="size-5 shrink-0 animate-spin text-muted-foreground" />
              )}
              <span
                className={cn(
                  step.done ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {step.done ? step.label : (step.pending ?? step.label)}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
