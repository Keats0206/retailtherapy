"use client";

import Link from "next/link";
import { Calendar, Check, Link2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";
import { hostShowPath, waitroomShowPath } from "@/lib/show-urls";

export default function ScheduledShareClient({
  slug,
  title,
  scheduledFor,
}: {
  slug: string;
  title: string;
  scheduledFor: string;
}) {
  const [copied, setCopied] = useState(false);
  const waitroomPath = waitroomShowPath(slug);
  const scheduledLabel = new Date(scheduledFor).toLocaleString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  async function copyLink() {
    const url = `${window.location.origin}${waitroomPath}`;
    try {
      await navigator.clipboard.writeText(url);
      trackEvent(AnalyticsEvent.HOST_SHARE_LINK, { area: "scheduled_confirm" });
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-6 py-12">
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-muted">
          <Check className="size-7 text-foreground" />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-normal tracking-tight">Show scheduled</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">{title}</span> is on the
            calendar. Share the waitroom link so people can join when you go
            live.
          </p>
        </div>
      </div>

      <div className="soft-panel flex flex-col gap-4 p-5">
        <div className="flex items-start gap-3">
          <Calendar className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="flex flex-col gap-0.5">
            <span className="micro text-muted-foreground">Goes live</span>
            <span className="text-sm">{scheduledLabel}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="micro text-muted-foreground">Share link</span>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-none bg-muted px-3 py-2 text-sm">
              {waitroomPath}
            </code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 gap-1.5"
              onClick={() => void copyLink()}
            >
              {copied ? <Check className="size-3.5" /> : <Link2 className="size-3.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button render={<Link href="/browse" />}>Back to browse</Button>
        <Button
          variant="ghost"
          render={<Link href={hostShowPath(slug)} />}
        >
          Manage show
        </Button>
      </div>
    </main>
  );
}
