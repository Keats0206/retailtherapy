"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ShowWrapUpSteps } from "@/components/show-wrap-up-steps";
import type { RecordingStatus } from "@/lib/show-public";

/**
 * What is still happening after the host stops broadcasting.
 *
 * Ending a show looks instant and isn't: the recap page is up immediately, but
 * Mux is still packaging the recording behind it. Without this the host sees
 * "Recording processing" on a black rectangle and reasonably concludes it
 * failed. Naming the one outstanding step — and showing the finished ones —
 * turns a broken-looking page into a page that is working.
 */
export function PostShowProcessing({
  trailCount,
  recordingStatus,
  className,
}: {
  trailCount: number;
  recordingStatus: RecordingStatus;
  className?: string;
}) {
  const recordingLabel =
    recordingStatus === "ready"
      ? "Recording packaged"
      : recordingStatus === "unavailable"
        ? "No recording captured"
        : recordingStatus === "failed"
          ? "Recording unavailable"
          : "Recording packaged";

  const recordingPending =
    recordingStatus === "processing"
      ? "Packaging recording — usually a few minutes"
      : recordingStatus === "unavailable"
        ? "The broadcast wasn't archived — the trail is still saved"
        : recordingStatus === "failed"
          ? "Packaging didn't finish — viewers can still shop the trail"
          : null;

  const steps = [
    { id: "broadcast", label: "Broadcast stopped", done: true, pending: null },
    {
      id: "trail",
      label:
        trailCount > 0
          ? `Shopping trail saved — ${trailCount} ${trailCount === 1 ? "item" : "items"}`
          : "Shopping trail saved",
      done: true,
      pending: null,
    },
    { id: "recap", label: "Recap page published for viewers", done: true, pending: null },
    {
      id: "recording",
      label: recordingLabel,
      done: recordingStatus !== "processing",
      pending: recordingPending,
    },
  ];

  const outstanding = steps.filter((step) => !step.done).length;

  return (
    <Card size="sm" className={className}>
      <CardHeader>
        <CardTitle className="text-base">
          {outstanding === 0 ? "Everything's saved" : "Ending your show"}
        </CardTitle>
        <CardDescription>
          {outstanding === 0
            ? recordingStatus === "ready"
              ? "Your recap is complete — the replay is live on the share link."
              : "Your recap is live. Viewers can shop the trail even without a replay."
            : "Your recap is already live. You can close this page; the rest finishes without you."}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <ShowWrapUpSteps steps={steps} />
      </CardContent>
    </Card>
  );
}
