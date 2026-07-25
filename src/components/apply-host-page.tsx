"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Pin, Radio, Video } from "lucide-react";

import { ApplyPageChrome } from "@/components/apply-page-chrome";
import { HostEarningsMockup } from "@/components/host-earnings-mockup";
import {
  InstagramIcon,
  TikTokIcon,
  YouTubeIcon,
} from "@/components/social-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";
import {
  EMPTY_WAITLIST_DRAFT,
  hasAnySocial,
  readWaitlistDraft,
  writeWaitlistDraft,
  type WaitlistSocials,
} from "@/lib/waitlist-draft";

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

const SOCIAL_FIELDS: [
  keyof WaitlistSocials,
  string,
  React.ReactNode,
][] = [
  ["instagram", "Instagram handle", <InstagramIcon key="ig" />],
  ["tiktok", "TikTok handle", <TikTokIcon key="tt" />],
  ["youtube", "YouTube handle", <YouTubeIcon key="yt" />],
];

export function ApplyHostPage() {
  const router = useRouter();
  const [socials, setSocials] = useState<WaitlistSocials>(() => {
    return readWaitlistDraft()?.socials ?? EMPTY_WAITLIST_DRAFT.socials;
  });
  const [error, setError] = useState<string | null>(null);

  function handleContinue(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasAnySocial(socials)) {
      setError("Add at least one social handle to continue.");
      return;
    }

    writeWaitlistDraft({ socials });
    trackEvent(AnalyticsEvent.APPLY_CONTINUE, { area: "apply" });
    router.push("/apply/email");
  }

  return (
    <ApplyPageChrome>
      <main>
        <section className="border-b border-border">
          <div className="mx-auto w-full max-w-5xl px-6 py-16 lg:py-24">
            <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-14">
              <div className="flex flex-col gap-6 lg:sticky lg:top-24">
                <div className="flex flex-col gap-3">
                  <span className="micro text-live">Apply to host</span>
                  <h1 className="max-w-lg text-4xl font-normal leading-[1.06] tracking-tight sm:text-5xl">
                    Turn your audience into a live shopping channel.
                  </h1>
                  <p className="max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
                    Frontrow is invite-only for creators right now. Share where
                    you publish and we&rsquo;ll reach out as we open up spots.
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

                <form
                  onSubmit={handleContinue}
                  className="flex flex-col gap-5 rounded-xl bg-muted/40 p-6 ring-1 ring-foreground/8 lg:p-8"
                >
                  <div className="flex flex-col gap-1">
                    <h2 className="text-xl font-normal tracking-tight">
                      Where do you publish?
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Add at least one handle so we can find your work.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3">
                    {SOCIAL_FIELDS.map(([key, label, icon]) => (
                      <div key={key} className="flex items-center gap-3">
                        <span className="flex size-5 shrink-0 items-center justify-center text-muted-foreground">
                          {icon}
                        </span>
                        <span className="text-sm text-muted-foreground">@</span>
                        <Input
                          value={socials[key]}
                          aria-label={label}
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
                    ))}
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="bg-live text-live-foreground hover:bg-live/90"
                  >
                    Continue
                    <ArrowRight data-icon="inline-end" />
                  </Button>

                  {error ? (
                    <p
                      role="alert"
                      className="text-sm leading-relaxed text-destructive"
                    >
                      {error}
                    </p>
                  ) : null}
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>
    </ApplyPageChrome>
  );
}
