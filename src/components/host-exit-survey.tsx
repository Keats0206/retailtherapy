"use client";

import { useState } from "react";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { readResponseJson } from "@/lib/fetch-json";
import { cn } from "@/lib/utils";

const RATINGS = [1, 2, 3, 4, 5] as const;

/**
 * "How was that?", asked once, on the recap page, in the minute after the host
 * ends a show.
 *
 * The moment matters more than the instrument: a host who just fought the share
 * picker for five minutes will say so here and nowhere else. The note is
 * optional and the whole card is dismissible by simply not answering — nothing
 * downstream waits on it.
 */
export function HostExitSurvey({
  slug,
  initialRating = null,
  className,
}: {
  slug: string;
  /** Their previous answer, when they've already rated this show. */
  initialRating?: number | null;
  className?: string;
}) {
  const [rating, setRating] = useState<number | null>(initialRating);
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(initialRating != null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(value: number, text: string) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/shows/${slug}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: value, note: text.trim() || null }),
      });
      const data = await readResponseJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? "Couldn’t save that");
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t save that");
    } finally {
      setSaving(false);
    }
  }

  if (submitted) {
    return (
      <Card size="sm" className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="flex size-6 items-center justify-center rounded-full bg-live text-live-foreground">
              <Check className="size-3.5" />
            </span>
            Thanks — that helps
          </CardTitle>
          <CardDescription>
            We read every one of these, and they decide what gets fixed next.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card size="sm" className={className}>
      <CardHeader>
        <CardTitle className="text-base">
          How was your experience as a streamer?
        </CardTitle>
        <CardDescription>
          Only you and us see this — it never appears on your recap.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap gap-2">
            {RATINGS.map((value) => (
              <button
                key={value}
                type="button"
                aria-label={`${value} out of 5`}
                aria-pressed={rating === value}
                onClick={() => setRating(value)}
                className={cn(
                  "size-11 rounded-full text-sm font-semibold tabular-nums ring-1 transition-colors",
                  rating === value
                    ? "bg-foreground text-background ring-foreground"
                    : "ring-foreground/15 hover:bg-foreground/8",
                )}
              >
                {value}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Rough</span>
            <span>Great</span>
          </div>
        </div>

        {rating != null ? (
          <div className="flex flex-col gap-2">
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                rating <= 3
                  ? "What got in the way?"
                  : "Anything that would make the next one easier?"
              }
              aria-label="What would you change?"
            />
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <Button
              type="button"
              className="w-fit"
              disabled={saving}
              onClick={() => void submit(rating, note)}
            >
              {saving ? "Sending…" : "Send feedback"}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
