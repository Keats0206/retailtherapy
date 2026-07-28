/**
 * Show setup collected during host onboarding (intent, items, socials).
 * Persisted on the `streams.setup` jsonb column when the host goes live.
 */

export type ShowIntent = "season" | "event" | "browsing";

export type ShowSocials = {
  instagram: string;
  tiktok: string;
  youtube: string;
};

export type ShowSetup = {
  intent: ShowIntent;
  /** Season or event chip, when intent is not browsing. */
  detail: string | null;
  items: string[];
  socials: ShowSocials;
};

/** Client draft while the host is still naming the show. */
export type ShowSetupDraft = {
  intent: ShowIntent | null;
  detail: string | null;
  items: string[];
  showName: string;
  /** Typing by hand stops the auto-suggestion from clobbering the field. */
  nameTouched: boolean;
  socials: ShowSocials;
};

export const EMPTY_DRAFT: ShowSetupDraft = {
  intent: null,
  detail: null,
  items: [],
  showName: "",
  nameTouched: false,
  socials: { instagram: "", tiktok: "", youtube: "" },
};

const STORAGE_KEY = "frontrow:show-setup-draft";

const INTENTS = new Set<ShowIntent>(["season", "event", "browsing"]);

function cleanHandle(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/^@+/, "").slice(0, 64);
}

/** Normalize an API / storage payload into a persisted ShowSetup, or null. */
export function parseShowSetup(input: unknown): ShowSetup | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;

  if (typeof raw.intent !== "string" || !INTENTS.has(raw.intent as ShowIntent)) {
    return null;
  }

  const intent = raw.intent as ShowIntent;
  const detail =
    typeof raw.detail === "string" && raw.detail.trim()
      ? raw.detail.trim().slice(0, 64)
      : null;

  const items = Array.isArray(raw.items)
    ? raw.items
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 24)
    : [];

  const socialsRaw =
    raw.socials && typeof raw.socials === "object"
      ? (raw.socials as Record<string, unknown>)
      : {};

  return {
    intent,
    detail: intent === "browsing" ? null : detail,
    items,
    socials: {
      instagram: cleanHandle(socialsRaw.instagram),
      tiktok: cleanHandle(socialsRaw.tiktok),
      youtube: cleanHandle(socialsRaw.youtube),
    },
  };
}

export function draftToSetup(draft: ShowSetupDraft): ShowSetup | null {
  if (!draft.intent) return null;
  return parseShowSetup({
    intent: draft.intent,
    detail: draft.detail,
    items: draft.items,
    socials: draft.socials,
  });
}

export function writeShowSetupDraft(draft: ShowSetupDraft): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Private mode / quota — host can still type a title on /host.
  }
}

export function readShowSetupDraft(): ShowSetupDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ShowSetupDraft>;
    return {
      intent:
        typeof parsed.intent === "string" &&
        INTENTS.has(parsed.intent as ShowIntent)
          ? (parsed.intent as ShowIntent)
          : null,
      detail: typeof parsed.detail === "string" ? parsed.detail : null,
      items: Array.isArray(parsed.items)
        ? parsed.items.filter((item): item is string => typeof item === "string")
        : [],
      showName: typeof parsed.showName === "string" ? parsed.showName : "",
      nameTouched: Boolean(parsed.nameTouched),
      socials: {
        instagram: cleanHandle(parsed.socials?.instagram),
        tiktok: cleanHandle(parsed.socials?.tiktok),
        youtube: cleanHandle(parsed.socials?.youtube),
      },
    };
  } catch {
    return null;
  }
}

export function clearShowSetupDraft(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
