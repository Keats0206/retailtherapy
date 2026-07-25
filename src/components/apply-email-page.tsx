"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { ArrowLeft } from "lucide-react";

import { ApplyPageChrome } from "@/components/apply-page-chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";
import { readWaitlistDraft } from "@/lib/waitlist-draft";

export function ApplyEmailPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const clerkEmail = isLoaded
    ? (user?.primaryEmailAddress?.emailAddress ?? "")
    : "";
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const draft = readWaitlistDraft();
    if (!draft) {
      router.replace("/apply");
      return;
    }
    queueMicrotask(() => setReady(true));
  }, [router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const draft = readWaitlistDraft();
    if (!draft) {
      router.replace("/apply");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email || clerkEmail,
          socials: draft.socials,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(payload?.error ?? "Something went wrong. Try again.");
        return;
      }

      trackEvent(AnalyticsEvent.APPLY_SUBMIT, { area: "apply" });
      router.replace("/apply/confirmed");
    } catch {
      setError("Couldn't reach the server. Check your connection and retry.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready) return null;

  return (
    <ApplyPageChrome>
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="flex w-full max-w-md flex-col gap-8">
          <div className="flex flex-col gap-2">
            <Button
              variant="ghost"
              size="micro"
              className="w-fit px-0 text-muted-foreground hover:text-foreground"
              render={<Link href="/apply" />}
            >
              <ArrowLeft data-icon="inline-start" />
              Back
            </Button>
            <span className="micro text-live">Apply to host</span>
            <h1 className="text-3xl font-normal tracking-tight sm:text-4xl">
              What&rsquo;s your email?
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              We&rsquo;ll use this to reach out about becoming a creator on
              Frontrow.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-5 rounded-xl bg-muted/40 p-6 ring-1 ring-foreground/8"
          >
            <label htmlFor="email" className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">
                Email<span className="text-muted-foreground"> *</span>
              </span>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email || clerkEmail}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <Button
              type="submit"
              size="lg"
              className="bg-live text-live-foreground hover:bg-live/90"
              disabled={submitting}
            >
              {submitting ? "Submitting…" : "Submit application"}
            </Button>

            {error ? (
              <p
                role="alert"
                className="text-sm leading-relaxed text-destructive"
              >
                {error}
              </p>
            ) : null}

            <p className="text-xs leading-relaxed text-muted-foreground">
              By applying you agree we may email you about hosting on Frontrow.
              We don&rsquo;t share your info with third parties.
            </p>
          </form>
        </div>
      </main>
    </ApplyPageChrome>
  );
}
