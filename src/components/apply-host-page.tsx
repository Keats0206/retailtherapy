"use client";

import { useState } from "react";
import Link from "next/link";
import { Show, SignInButton, SignUpButton } from "@clerk/nextjs";
import { CheckCircle2, Pin, Radio, Video } from "lucide-react";

import { HostEarningsMockup } from "@/components/host-earnings-mockup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserMenu } from "@/components/user-menu";
import { cn } from "@/lib/utils";

const PERKS = [
  {
    icon: Video,
    title: "Browser-native hosting",
    description: "Go live from your laptop — no app download or studio setup.",
  },
  {
    icon: Pin,
    title: "Shop any store",
    description: "Drop affiliate links as you browse. Viewers shop along in real time.",
  },
  {
    icon: Radio,
    title: "Read the room live",
    description: "Votes and chat tell you what lands before you ever post a link.",
  },
] as const;

export function ApplyHostPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    setSubmitting(false);
    setSubmitted(true);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <header className="sticky top-0 z-10 border-b border-border/80 bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="micro font-bold">
            frontrow
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="micro"
              className="hidden sm:inline-flex"
              render={<Link href="/browse" />}
            >
              Browse shows
            </Button>
            <Show when="signed-out">
              <SignInButton mode="modal">
                <Button variant="ghost" size="micro">
                  Sign in
                </Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button size="micro">Get started</Button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <Button variant="ghost" size="micro" render={<Link href="/dashboard" />}>
                Dashboard
              </Button>
              <UserMenu />
            </Show>
          </nav>
        </div>
      </header>

      <main>
        <section className="border-b border-border">
          <div className="mx-auto w-full max-w-5xl px-6 py-16 lg:py-24">
            <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-14">
              <div className="flex flex-col gap-6 lg:sticky lg:top-24">
                <div className="flex flex-col gap-3">
                  <span className="micro text-live">Host program</span>
                  <h1 className="max-w-lg text-4xl font-normal leading-[1.06] tracking-tight sm:text-5xl">
                    Turn your audience into a live shopping channel.
                  </h1>
                  <p className="max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
                    Frontrow is invite-only for hosts right now. Apply with your
                    socials and we&rsquo;ll reach out when there&rsquo;s a fit.
                  </p>
                </div>

                <HostEarningsMockup />
              </div>

              <div className="flex flex-col gap-8">
                <div className="grid gap-4">
                  {PERKS.map((perk) => (
                    <div
                      key={perk.title}
                      className="flex gap-4 rounded-xl bg-muted/40 p-5 ring-1 ring-foreground/8"
                    >
                      <perk.icon
                        className="mt-0.5 size-4 shrink-0 text-live"
                        strokeWidth={1.75}
                      />
                      <div className="flex flex-col gap-1">
                        <h2 className="text-sm font-medium">{perk.title}</h2>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {perk.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {submitted ? (
                  <div className="flex flex-col items-center gap-4 rounded-xl bg-muted/40 px-6 py-12 text-center ring-1 ring-foreground/8">
                    <CheckCircle2
                      className="size-10 text-live"
                      strokeWidth={1.5}
                    />
                    <div className="flex max-w-sm flex-col gap-2">
                      <h2 className="text-xl font-normal tracking-tight">
                        Application received
                      </h2>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        Thanks for applying. We review host applications weekly and
                        will email you if there&rsquo;s a match.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="micro"
                      render={<Link href="/browse" />}
                    >
                      Browse live shows
                    </Button>
                  </div>
                ) : (
                  <form
                    onSubmit={handleSubmit}
                    className="flex flex-col gap-5 rounded-xl bg-muted/40 p-6 ring-1 ring-foreground/8 lg:p-8"
                  >
                    <div className="flex flex-col gap-1">
                      <h2 className="text-xl font-normal tracking-tight">
                        Apply to host
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Tell us where you publish and how big your audience is.
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Name" htmlFor="name" required>
                        <Input id="name" name="name" required autoComplete="name" />
                      </Field>
                      <Field label="Email" htmlFor="email" required>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          required
                          autoComplete="email"
                        />
                      </Field>
                    </div>

                    <Field label="Primary platform" htmlFor="platform" required>
                      <Input
                        id="platform"
                        name="platform"
                        placeholder="Instagram, TikTok, YouTube…"
                        required
                      />
                    </Field>

                    <Field label="Handle or channel URL" htmlFor="handle" required>
                      <Input
                        id="handle"
                        name="handle"
                        placeholder="@you or youtube.com/c/you"
                        required
                      />
                    </Field>

                    <Field
                      label="Follower / subscriber count"
                      htmlFor="subscribers"
                      required
                    >
                      <Input
                        id="subscribers"
                        name="subscribers"
                        placeholder="e.g. 25,000"
                        required
                      />
                    </Field>

                    <Field label="What would you shop live?" htmlFor="pitch">
                      <textarea
                        id="pitch"
                        name="pitch"
                        rows={3}
                        placeholder="Vintage finds, beauty restocks, sneaker drops…"
                        className={cn(
                          "w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none",
                          "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm",
                        )}
                      />
                    </Field>

                    <Button
                      type="submit"
                      size="lg"
                      className="bg-live text-live-foreground hover:bg-live/90"
                      disabled={submitting}
                    >
                      {submitting ? "Submitting…" : "Submit application"}
                    </Button>

                    <p className="text-xs leading-relaxed text-muted-foreground">
                      By applying you agree we may contact you about hosting on
                      Frontrow. We don&rsquo;t share your info with third parties.
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-8">
          <span className="micro text-muted-foreground">frontrow</span>
          <Link
            href="/browse"
            className="micro text-muted-foreground transition-colors hover:text-foreground"
          >
            Browse shows
          </Link>
        </div>
      </footer>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">
        {label}
        {required ? <span className="text-muted-foreground"> *</span> : null}
      </span>
      {children}
    </label>
  );
}
