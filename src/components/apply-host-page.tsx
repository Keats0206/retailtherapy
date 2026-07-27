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
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(data.get("email") ?? ""),
          name: String(data.get("name") ?? ""),
          handle: String(data.get("handle") ?? ""),
          pitch: String(data.get("pitch") ?? ""),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(payload?.error ?? "Something went wrong. Try again.");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Couldn't reach the server. Check your connection and retry.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-base font-bold uppercase tracking-widest">
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
                  <span className="micro text-live">Host waitlist</span>
                  <h1 className="max-w-lg text-4xl font-normal leading-[1.06] tracking-tight sm:text-5xl">
                    Turn your audience into a live shopping channel.
                  </h1>
                  <p className="max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
                    Frontrow is invite-only for hosts right now. Leave your email
                    and we&rsquo;ll send an invite as we open up spots. We work
                    through the list in order — there&rsquo;s no instant
                    self-serve signup.
                  </p>
                </div>

                <HostEarningsMockup />
              </div>

              <div className="flex flex-col gap-8">
                <div className="grid gap-4">
                  {PERKS.map((perk) => (
                    <div
                      key={perk.title}
                      className="soft-panel flex gap-4 p-5"
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
                  <div className="soft-panel flex flex-col items-center gap-4 px-6 py-12 text-center">
                    <CheckCircle2
                      className="size-10 text-live"
                      strokeWidth={1.5}
                    />
                    <div className="flex max-w-sm flex-col gap-2">
                      <h2 className="text-xl font-normal tracking-tight">
                        You&rsquo;re on the list
                      </h2>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        We&rsquo;ll email your invite as spots open up. In the
                        meantime, watch a show to see how hosting works.
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
                    className="soft-panel flex flex-col gap-5 p-6 lg:p-8"
                  >
                    <div className="flex flex-col gap-1">
                      <h2 className="text-xl font-normal tracking-tight">
                        Join the host waitlist
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Email is all we need. The rest helps us move you up the
                        list.
                      </p>
                    </div>

                    <Field label="Email" htmlFor="email" required>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        required
                        autoComplete="email"
                        placeholder="you@example.com"
                      />
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Name" htmlFor="name">
                        <Input id="name" name="name" autoComplete="name" />
                      </Field>
                      <Field label="Handle or channel" htmlFor="handle">
                        <Input
                          id="handle"
                          name="handle"
                          placeholder="@you or youtube.com/c/you"
                        />
                      </Field>
                    </div>

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
                      variant="live"
                      size="lg"
                      disabled={submitting}
                    >
                      {submitting ? "Joining…" : "Join the waitlist"}
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
                      By joining you agree we may email you about hosting on
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
