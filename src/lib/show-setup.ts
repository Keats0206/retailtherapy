/**
 * Show setup collected during host onboarding (intent, items, socials).
 * Persisted on the `streams.setup` jsonb column when the host goes live.
 */

// Relative, not the `@/` alias: db/schema.ts imports this file, and drizzle-kit
// loads that outside Next, where tsconfig paths do not resolve.
import { isValidHttpsUrl } from "./validate-url";

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
  /**
   * The challenge event this show is an attempt at, carried from
   * `/host?challenge=<slug>` through to the create-show call. The server
   * resolves it to an id and rejects unknown or closed events, so a stale slug
   * here just means an ordinary show.
   */
  challengeSlug: string | null;
  /**
   * The store the challenge asks the host to shop, resolved server-side on the
   * setup route. Carried through so the go-live screen can offer *that* store
   * as the first step instead of the generic recommendations — taking on an
   * event and then hunting for its shop in a list is the wrong shape.
   *
   * Display-only, and never trusted: the server re-resolves the challenge from
   * `challengeSlug` when the show is created.
   */
  challengeStoreUrl: string | null;
  challengeBrandName: string | null;
};

export const EMPTY_DRAFT: ShowSetupDraft = {
  intent: null,
  detail: null,
  items: [],
  showName: "",
  nameTouched: false,
  socials: { instagram: "", tiktok: "", youtube: "" },
  challengeSlug: null,
  challengeStoreUrl: null,
  challengeBrandName: null,
};

/** Slugs are hand-written; keep the round trip to the same shape we issue. */
function cleanSlug(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const slug = value.trim().toLowerCase().slice(0, 64);
  return /^[a-z0-9-]+$/.test(slug) ? slug : null;
}

/**
 * The draft round-trips through sessionStorage, so a store link read back out
 * is untrusted input by the time we hand it to `window.open`. Only https
 * survives — `javascript:` in a store button would be a self-XSS.
 */
function cleanStoreUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return isValidHttpsUrl(trimmed) ? trimmed : null;
}

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

/** Local name suggestions keyed by the most specific onboarding answer. */
const NAME_POOLS: Record<string, string[]> = {
  fall: ["layers incoming", "sweater weather watch", "the fall edit, live"],
  winter: ["coat season opens", "cold snap cart", "the winter warm-up"],
  spring: ["light layers only", "spring clean, new cart", "petal to the metal"],
  summer: ["heatwave haul", "linen season live", "out of office fits"],
  wedding: ["something borrowed live", "guest list dressing", "aisle be shopping"],
  festival: ["festival fits forever", "dust and glitter run", "main stage wardrobe"],
  holiday: ["holiday gifting spree", "wrapped and ready", "the gift list live"],
  "back to school": ["first day fits", "locker room refresh", "study hall haul"],
  "back to work": ["office era reboot", "commute-proof cart", "monday uniform hunt"],
  "new job": ["first day energy", "new badge, new bag", "dress for the offer"],
  season: ["four seasons, one cart", "weather permitting", "forecast: shopping"],
  event: ["save the date, save the look", "occasion incoming", "rsvp: shopping"],
  browsing: ["no agenda, all links", "just looking, kind of", "window shopping, live"],
};

/** Pick a default show title from onboarding answers when the host skips naming. */
export function suggestShowName(draft: ShowSetupDraft): string {
  const key = draft.detail?.toLowerCase() ?? draft.intent ?? "browsing";
  const pool = NAME_POOLS[key] ?? NAME_POOLS.browsing;
  return pool[Math.floor(Math.random() * pool.length)] ?? "Untitled show";
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
      challengeSlug: cleanSlug(parsed.challengeSlug),
      challengeStoreUrl: cleanStoreUrl(parsed.challengeStoreUrl),
      challengeBrandName:
        typeof parsed.challengeBrandName === "string"
          ? parsed.challengeBrandName.slice(0, 64)
          : null,
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
