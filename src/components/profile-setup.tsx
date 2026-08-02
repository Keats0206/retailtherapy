"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import {
  ArrowUpRight,
  Check,
  Heart,
  ImageUp,
  ShoppingBag,
  UserRound,
} from "lucide-react";

// Type-only: keeps this module importable from DB-free pages (the prototype),
// which pass their own fake action instead of the real server one.
import type { SaveProfileState } from "@/app/(chrome)/profile/actions";
import {
  InstagramIcon,
  SubstackIcon,
  TikTokIcon,
  YouTubeIcon,
} from "@/components/social-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";
import {
  normalizeSocialInput,
  SOCIAL_PLATFORM_META,
  socialLinkLabel,
  socialProfileUrl,
  type ProfileSocials,
  type SocialPlatform,
} from "@/lib/social-links";

const PLATFORM_ICONS: Record<SocialPlatform, React.ReactNode> = {
  instagram: <InstagramIcon />,
  tiktok: <TikTokIcon />,
  youtube: <YouTubeIcon />,
  substack: <SubstackIcon />,
  shopmy: <ShoppingBag className="size-4" strokeWidth={1.75} />,
  ltk: <Heart className="size-4" strokeWidth={1.75} />,
};

const IDLE: SaveProfileState = { status: "idle" };

/**
 * The profile form: name, city, and the six places a host publishes. Fills
 * /home on first sign-in (mode "onboarding") and /profile afterwards (mode
 * "edit") — same fields, different framing.
 *
 * Social inputs take a handle or a pasted link; the caption above each field
 * previews the resolved profile URL live, using the same normalizer the
 * server persists through, so what you see is exactly what gets saved.
 */
export function ProfileSetup({
  mode = "onboarding",
  initialName = "",
  initialCity = "",
  initialBio = "",
  initialSocials = {},
  action,
  browseHref = "/home?view=browse",
  hostHref = "/host/setup",
}: {
  mode?: "onboarding" | "edit";
  initialName?: string;
  initialCity?: string;
  initialBio?: string;
  initialSocials?: ProfileSocials;
  /** saveProfileAction in production; the prototype passes a fake instead. */
  action: (
    prev: SaveProfileState,
    formData: FormData,
  ) => Promise<SaveProfileState>;
  browseHref?: string;
  hostHref?: string;
}) {
  const [state, formAction, pending] = useActionState(action, IDLE);
  const [name, setName] = useState(initialName);
  const [city, setCity] = useState(initialCity);
  const [bio, setBio] = useState(initialBio);
  const [socials, setSocials] = useState<Record<SocialPlatform, string>>(
    () => {
      const values = {} as Record<SocialPlatform, string>;
      for (const { key } of SOCIAL_PLATFORM_META) {
        values[key] = initialSocials[key] ?? "";
      }
      return values;
    },
  );

  // "Saved" shows until the next edit, so the form quietly confirms the last
  // save without needing a toast.
  const [dirty, setDirty] = useState(false);
  const lastSavedAt = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (state.status !== "saved" || state.savedAt === lastSavedAt.current) {
      return;
    }
    lastSavedAt.current = state.savedAt;
    setDirty(false);
    trackEvent(AnalyticsEvent.PROFILE_SAVE, { area: `profile_${mode}` });
  }, [state, mode]);

  const saved = state.status === "saved" && !dirty;
  const onboarding = mode === "onboarding";

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-6 py-10 lg:py-14">
      <section className="flex flex-col gap-3">
        <span className="micro text-muted-foreground">
          {onboarding ? "Welcome to frontrow" : "Your profile"}
        </span>
        <h1 className="text-3xl font-normal leading-tight tracking-tight sm:text-4xl">
          {onboarding ? "Set up your profile" : "Edit your profile"}
        </h1>
        <p className="max-w-lg text-base leading-relaxed text-muted-foreground">
          Tell people who you are and where else to find you — it shows up
          alongside your shows.
        </p>
      </section>

      <form action={formAction} className="flex flex-col gap-10">
        <section className="flex flex-col gap-4">
          <h2 className="micro text-muted-foreground">About you</h2>
          <ProfilePhotoField />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-muted-foreground">Name</span>
              <Input
                name="name"
                value={name}
                autoComplete="name"
                placeholder="Your name"
                onChange={(e) => {
                  setName(e.target.value);
                  setDirty(true);
                }}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-muted-foreground">City</span>
              <Input
                name="city"
                value={city}
                autoComplete="address-level2"
                placeholder="Where you’re based"
                onChange={(e) => {
                  setCity(e.target.value);
                  setDirty(true);
                }}
              />
            </label>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-muted-foreground">Bio</span>
            <textarea
              name="bio"
              value={bio}
              rows={3}
              maxLength={280}
              placeholder="A little about you — what you shop for, what you love to show."
              className="w-full resize-none rounded-2xl border border-input bg-transparent px-4 py-3 text-base leading-relaxed outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              onChange={(e) => {
                setBio(e.target.value);
                setDirty(true);
              }}
            />
          </label>
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="micro text-muted-foreground">Your accounts</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Drop a link or just your username — the profile link fills in as
              you type.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            {SOCIAL_PLATFORM_META.map(({ key, label, placeholder }) => (
              <SocialField
                key={key}
                platform={key}
                label={label}
                placeholder={placeholder}
                value={socials[key]}
                onChange={(value) => {
                  setSocials((prev) => ({ ...prev, [key]: value }));
                  setDirty(true);
                }}
              />
            ))}
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
          {saved ? (
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Check className="size-4 text-live" />
              Saved
            </span>
          ) : null}
          {state.status === "error" ? (
            <span className="text-sm text-destructive">{state.message}</span>
          ) : null}
        </div>
      </form>

      <section className="mt-auto flex flex-col gap-6 rounded-2xl bg-muted/40 p-8 ring-1 ring-foreground/8">
        <div className="flex flex-col gap-2">
          <span className="micro text-muted-foreground">
            {saved ? "You’re all set" : "Next up"}
          </span>
          <p className="max-w-md text-base leading-relaxed text-muted-foreground">
            Watch what’s live right now, or go live yourself and shop out
            loud.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            variant="outline"
            size="lg"
            className="sm:px-8"
            render={<Link href={browseHref} />}
            onClick={() =>
              trackEvent(AnalyticsEvent.CTA_BROWSE, { area: `profile_${mode}` })
            }
          >
            Browse shows
          </Button>
          <Button
            variant="live"
            size="lg"
            className="sm:px-8"
            render={<Link href={hostHref} />}
            onClick={() =>
              trackEvent(AnalyticsEvent.CTA_GO_LIVE, {
                area: `profile_${mode}`,
              })
            }
          >
            Host a show
          </Button>
        </div>
      </section>
    </main>
  );
}

/**
 * Profile photo, stored on the Clerk account (`user.setProfileImage`) — the
 * same image the rest of the app already shows for the user, so there's no
 * separate storage to stand up. Signed out (the prototype), it still previews
 * the picked file locally so the design is reviewable.
 */
function ProfilePhotoField() {
  const { user } = useUser();
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Object URLs leak unless revoked; this cleans up the previous one on every
  // replacement and the last one on unmount.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const src = preview ?? user?.imageUrl ?? null;

  async function onFile(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    setError(null);
    // Show the pick immediately; Clerk's hosted URL catches up after upload.
    setPreview(URL.createObjectURL(file));
    if (!user) return;
    setUploading(true);
    try {
      await user.setProfileImage({ file });
    } catch {
      setError("Couldn’t upload that photo — try a different one.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        aria-label="Upload a profile photo"
        className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-muted-foreground ring-1 ring-foreground/8 transition-shadow hover:ring-foreground/25"
        onClick={() => fileInput.current?.click()}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="h-full w-full object-cover" />
        ) : (
          <UserRound className="size-7" strokeWidth={1.5} />
        )}
      </button>
      <div className="flex flex-col items-start gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => fileInput.current?.click()}
        >
          <ImageUp data-icon="inline-start" />
          {uploading ? "Uploading…" : src ? "Change photo" : "Upload photo"}
        </Button>
        {error ? (
          <span className="text-xs text-destructive">{error}</span>
        ) : (
          <span className="text-xs text-muted-foreground">
            Shows next to your name on your shows.
          </span>
        )}
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          // Same-file re-picks should still fire change next time.
          e.target.value = "";
        }}
      />
    </div>
  );
}

function SocialField({
  platform,
  label,
  placeholder,
  value,
  onChange,
}: {
  platform: SocialPlatform;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = `profile-social-${platform}`;
  // Preview through the same normalizer the server saves through.
  const stored = normalizeSocialInput(platform, value);
  const href = socialProfileUrl(platform, stored);
  const linkLabel = socialLinkLabel(platform, stored);

  return (
    <div className="flex flex-col gap-1.5">
      {/* ml-12 lines the caption up with the input, past the icon column. */}
      <div className="ml-12 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm text-muted-foreground">
          {label}
        </label>
        {href && linkLabel ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-w-0 items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <span className="truncate">{linkLabel}</span>
            <ArrowUpRight className="size-3.5 shrink-0" />
          </a>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {PLATFORM_ICONS[platform]}
        </span>
        <Input
          id={id}
          name={`social-${platform}`}
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}
