"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";
import { LAUNCH_PARTNER_BRANDS } from "@/lib/partner-brands";
import { hasAnySocial, type WaitlistSocials } from "@/lib/waitlist-draft";

const STEPS = [
  {
    title: "Apply",
    description:
      "Share your handles and what you'd shop live. We review every application.",
  },
  {
    title: "Get matched to a brand",
    description:
      "Launch partners are sponsoring live shopping with real budgets — pick the brief that fits.",
  },
  {
    title: "Go live from your browser",
    description:
      "No app download. Share your screen, drop links, and let the room vote on every pick.",
  },
] as const;

const SOCIAL_FIELDS: [keyof WaitlistSocials, string][] = [
  ["instagram", "Instagram"],
  ["tiktok", "TikTok"],
  ["youtube", "YouTube"],
];

const EMPTY_SOCIALS: WaitlistSocials = {
  instagram: "",
  tiktok: "",
  youtube: "",
};

export function CreatorWaitlistPage() {
  const formRef = useRef<HTMLElement>(null);
  const { user, isLoaded } = useUser();
  const clerkEmail = isLoaded
    ? (user?.primaryEmailAddress?.emailAddress ?? "")
    : "";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [link, setLink] = useState("");
  const [pitch, setPitch] = useState("");
  const [socials, setSocials] = useState<WaitlistSocials>(EMPTY_SOCIALS);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function scrollToApply() {
    trackEvent(AnalyticsEvent.CTA_APPLY, { area: "creators" });
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasAnySocial(socials)) {
      setError("Add at least one social handle so we can find your work.");
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
          name: name || undefined,
          handle: link || undefined,
          pitch: pitch || undefined,
          socials,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(payload?.error ?? "Something went wrong. Try again.");
        return;
      }

      trackEvent(AnalyticsEvent.APPLY_SUBMIT, { area: "creators" });
      setSubmitted(true);
    } catch {
      setError("Couldn't reach the server. Check your connection and retry.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main>
        <section className="border-b border-border">
          <div className="mx-auto w-full max-w-5xl px-6 py-16 lg:py-24">
            <div className="flex max-w-3xl flex-col gap-8">
              <div className="flex flex-col gap-4">
                <h1 className="text-4xl font-normal leading-[1.06] tracking-tight sm:text-5xl lg:text-6xl">
                  Get paid to shop.
                </h1>
                <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                  Brands will pay you to livestream on frontrow. We&rsquo;re
                  onboarding creators now.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <p className="text-sm font-medium text-muted-foreground">
                  Work with brands like this.
                </p>
                <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3">
                  {LAUNCH_PARTNER_BRANDS.map((brand) => (
                    <div
                      key={brand.name}
                      className="flex h-16 items-center justify-center bg-background px-4"
                    >
                      <span className="text-sm font-medium tracking-wide">
                        {brand.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button size="lg" onClick={scrollToApply}>
                  Apply now
                </Button>
                <p className="text-sm text-muted-foreground">
                  Any size welcome — if you&rsquo;re excited, we want to hear
                  from you.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-border bg-muted/20">
          <div className="mx-auto w-full max-w-5xl px-6 py-16 lg:py-20">
            <div className="flex flex-col gap-10">
              <div className="flex flex-col gap-2">
                <span className="micro text-muted-foreground">How it works</span>
                <h2 className="text-3xl font-normal tracking-tight sm:text-4xl">
                  Three steps to go live
                </h2>
              </div>

              <ol className="grid gap-px bg-border md:grid-cols-3">
                {STEPS.map((step, index) => (
                  <li
                    key={step.title}
                    className="flex flex-col gap-4 bg-background p-6"
                  >
                    <span className="micro text-muted-foreground">
                      Step {index + 1}
                    </span>
                    <div className="flex flex-col gap-2">
                      <h3 className="text-lg font-medium">{step.title}</h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section
          ref={formRef}
          id="apply"
          className="scroll-mt-24 border-b border-border"
        >
          <div className="mx-auto w-full max-w-5xl px-6 py-16 lg:py-24">
            <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-14">
              <div className="flex flex-col gap-4 lg:sticky lg:top-24">
                <span className="micro text-muted-foreground">Apply</span>
                <h2 className="text-3xl font-normal tracking-tight sm:text-4xl">
                  Tell us about you
                </h2>
                <p className="max-w-md text-base leading-relaxed text-muted-foreground">
                  Name, email, your handles, and what you&rsquo;d shop live.
                  Takes about a minute.
                </p>
                <div className="soft-panel p-5">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    We read every application. The more we see where you
                    publish, the faster we can match you to a brand.
                  </p>
                </div>
              </div>

              {submitted ? (
                <div className="flex flex-col items-center gap-6 bg-muted/40 p-8 text-center ring-1 ring-foreground/8 lg:p-10">
                  <div className="flex flex-col gap-2">
                    <span className="micro text-muted-foreground">
                      Application received
                    </span>
                    <h3 className="text-2xl font-normal tracking-tight">
                      We&rsquo;ll be in touch
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Thanks for applying. We review every submission and will
                      reach out by email when a creator spot opens up.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="micro"
                    render={<Link href="/" />}
                    onClick={() =>
                      trackEvent(AnalyticsEvent.APPLY_CONFIRMED, {
                        area: "creators",
                      })
                    }
                  >
                    Browse live shows
                  </Button>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className="flex flex-col gap-5 bg-muted/40 p-6 ring-1 ring-foreground/8 lg:p-8"
                >
                  <div className="flex flex-col gap-1">
                    <h3 className="text-xl font-normal tracking-tight">
                      Your details
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Takes about a minute. Add at least one social handle.
                    </p>
                  </div>

                  <label htmlFor="name" className="flex flex-col gap-1.5 text-sm">
                    <span className="font-medium">Name</span>
                    <Input
                      id="name"
                      name="name"
                      autoComplete="name"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </label>

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

                  <div className="flex flex-col gap-3">
                    <p className="text-sm font-medium">Where you publish</p>
                    {SOCIAL_FIELDS.map(([key, label]) => (
                      <label
                        key={key}
                        htmlFor={`social-${key}`}
                        className="flex flex-col gap-1.5 text-sm"
                      >
                        <span className="font-medium">{label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">@</span>
                          <Input
                            id={`social-${key}`}
                            value={socials[key]}
                            aria-label={`${label} handle`}
                            onChange={(e) => {
                              setError(null);
                              setSocials((prev) => ({
                                ...prev,
                                [key]: e.target.value,
                              }));
                            }}
                            placeholder="handle"
                          />
                        </div>
                      </label>
                    ))}
                  </div>

                  <label htmlFor="link" className="flex flex-col gap-1.5 text-sm">
                    <span className="font-medium">Link in bio or website</span>
                    <Input
                      id="link"
                      name="link"
                      type="url"
                      placeholder="https://linktr.ee/you"
                      value={link}
                      onChange={(e) => setLink(e.target.value)}
                    />
                  </label>

                  <label htmlFor="pitch" className="flex flex-col gap-1.5 text-sm">
                    <span className="font-medium">
                      What would you shop live?
                    </span>
                    <textarea
                      id="pitch"
                      name="pitch"
                      rows={3}
                      maxLength={280}
                      placeholder="Fashion hauls, beauty routines, wellness picks — whatever your audience would watch you buy."
                      value={pitch}
                      onChange={(e) => setPitch(e.target.value)}
                      className="min-h-[5.5rem] w-full resize-y rounded-none border border-input bg-transparent px-4 py-3 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    />
                  </label>

                  <Button type="submit" size="lg" disabled={submitting}>
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
                    By applying you agree we may email you about hosting on
                    frontrow. We don&rsquo;t share your info with third parties.
                  </p>
                </form>
              )}
            </div>
          </div>
        </section>
    </main>
  );
}
