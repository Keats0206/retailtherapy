export type WaitlistSocials = {
  instagram: string;
  tiktok: string;
  youtube: string;
};

export type WaitlistDraft = {
  socials: WaitlistSocials;
};

export const EMPTY_WAITLIST_DRAFT: WaitlistDraft = {
  socials: { instagram: "", tiktok: "", youtube: "" },
};

const STORAGE_KEY = "frontrow:waitlist-draft";

function cleanHandle(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/^@+/, "").slice(0, 64);
}

export function hasAnySocial(socials: WaitlistSocials): boolean {
  return Boolean(socials.instagram || socials.tiktok || socials.youtube);
}

export function writeWaitlistDraft(draft: WaitlistDraft): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Private mode / quota — step 2 will redirect back to /apply.
  }
}

export function readWaitlistDraft(): WaitlistDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WaitlistDraft>;
    const socials = {
      instagram: cleanHandle(parsed.socials?.instagram),
      tiktok: cleanHandle(parsed.socials?.tiktok),
      youtube: cleanHandle(parsed.socials?.youtube),
    };
    if (!hasAnySocial(socials)) return null;
    return { socials };
  } catch {
    return null;
  }
}

export function clearWaitlistDraft(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
