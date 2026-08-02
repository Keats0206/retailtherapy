/**
 * Social accounts for the profile form: Instagram, TikTok, YouTube, Substack,
 * ShopMy and LTK.
 *
 * People paste whatever they have on the clipboard — "@leon", "leon", or a
 * full profile URL — so `normalizeSocialInput` reduces any of those to one
 * stored value: a bare handle when the input is recognizably that platform's
 * profile, otherwise the URL itself (a Substack on a custom domain, a YouTube
 * /channel/… link). `socialProfileUrl` turns the stored value back into a
 * link, so the form can preview the profile as the user types.
 *
 * Client-safe on purpose: the form uses it live, the server action reuses the
 * exact same normalization before persisting.
 */

export const SOCIAL_PLATFORMS = [
  "instagram",
  "tiktok",
  "youtube",
  "substack",
  "shopmy",
  "ltk",
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

/** Stored on `profiles.socials` — handle or URL per platform; absent = unset. */
export type ProfileSocials = Partial<Record<SocialPlatform, string>>;

/** Longest value we persist per account, handle or URL. */
const MAX_STORED = 200;

type PlatformSpec = {
  label: string;
  placeholder: string;
  /** Does this bare hostname (www./m. already stripped) belong to the platform? */
  isHost: (host: string) => boolean;
  /** Pull a handle out of a matching URL, or null when it isn't a profile link. */
  extract: (url: URL) => string | null;
  /** Canonical profile link for a stored handle. */
  url: (handle: string) => string;
  /** What a plausible handle looks like — gate for URL extraction. */
  handle: RegExp;
};

function segments(url: URL): string[] {
  return url.pathname.split("/").filter(Boolean);
}

/** First path segment with any leading "@" dropped ("/@leon" and "/leon"). */
function firstSegment(url: URL): string | null {
  const first = segments(url)[0];
  return first ? decodeSegment(first).replace(/^@+/, "") : null;
}

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/** Instagram's non-profile top-level paths — a link to one is not an account. */
const INSTAGRAM_RESERVED = new Set([
  "p",
  "reel",
  "reels",
  "stories",
  "explore",
  "accounts",
  "direct",
]);

const PLATFORM_SPECS: Record<SocialPlatform, PlatformSpec> = {
  instagram: {
    label: "Instagram",
    placeholder: "@username or link",
    isHost: (host) => host === "instagram.com",
    extract: (url) => {
      const handle = firstSegment(url);
      if (!handle || INSTAGRAM_RESERVED.has(handle.toLowerCase())) return null;
      return handle;
    },
    url: (handle) => `https://instagram.com/${encodeURIComponent(handle)}`,
    handle: /^[A-Za-z0-9._]{1,30}$/,
  },
  tiktok: {
    label: "TikTok",
    placeholder: "@username or link",
    isHost: (host) => host === "tiktok.com",
    // Only /@name is a profile; video and discover links keep their URL.
    extract: (url) => {
      const first = segments(url)[0];
      if (!first?.startsWith("@")) return null;
      return decodeSegment(first).replace(/^@+/, "");
    },
    url: (handle) => `https://tiktok.com/@${encodeURIComponent(handle)}`,
    handle: /^[A-Za-z0-9._]{1,24}$/,
  },
  youtube: {
    label: "YouTube",
    placeholder: "@channel or link",
    isHost: (host) => host === "youtube.com" || host === "youtu.be",
    // /@name is a handle; /channel/UC…, /c/…, /user/… stay whole URLs.
    extract: (url) => {
      const first = segments(url)[0];
      if (!first?.startsWith("@")) return null;
      return decodeSegment(first).replace(/^@+/, "");
    },
    url: (handle) => `https://youtube.com/@${encodeURIComponent(handle)}`,
    handle: /^[A-Za-z0-9._-]{3,30}$/,
  },
  substack: {
    label: "Substack",
    placeholder: "name or yourname.substack.com",
    isHost: (host) => host === "substack.com" || host.endsWith(".substack.com"),
    extract: (url) => {
      const host = bareHost(url);
      // leon.substack.com → "leon"; substack.com/@leon → "leon".
      if (host.endsWith(".substack.com")) {
        return host.slice(0, -".substack.com".length);
      }
      const first = segments(url)[0];
      if (!first?.startsWith("@")) return null;
      return decodeSegment(first).replace(/^@+/, "");
    },
    // Subdomains can't be percent-encoded; the handle gate keeps them clean.
    url: (handle) => `https://${handle}.substack.com`,
    handle: /^[A-Za-z0-9-]{2,63}$/,
  },
  shopmy: {
    label: "ShopMy",
    placeholder: "username or shopmy.us link",
    isHost: (host) => host === "shopmy.us",
    // Storefronts are shopmy.us/<name>; deeper paths (collections…) keep the URL.
    extract: (url) => {
      const parts = segments(url);
      return parts.length === 1 ? decodeSegment(parts[0]) : null;
    },
    url: (handle) => `https://shopmy.us/${encodeURIComponent(handle)}`,
    handle: /^[A-Za-z0-9._-]{1,64}$/,
  },
  ltk: {
    label: "LTK",
    placeholder: "username or LTK link",
    isHost: (host) => host === "shopltk.com" || host === "liketoknow.it",
    extract: (url) => {
      const parts = segments(url);
      // shopltk.com/explore/<name>, or legacy liketoknow.it/<name>.
      if (bareHost(url) === "liketoknow.it") {
        return parts.length === 1 ? decodeSegment(parts[0]) : null;
      }
      if (parts[0]?.toLowerCase() !== "explore" || parts.length !== 2) {
        return null;
      }
      return decodeSegment(parts[1]);
    },
    url: (handle) =>
      `https://www.shopltk.com/explore/${encodeURIComponent(handle)}`,
    handle: /^[A-Za-z0-9._-]{1,64}$/,
  },
};

/** Ordered platform metadata for rendering the form. */
export const SOCIAL_PLATFORM_META: {
  key: SocialPlatform;
  label: string;
  placeholder: string;
}[] = SOCIAL_PLATFORMS.map((key) => ({
  key,
  label: PLATFORM_SPECS[key].label,
  placeholder: PLATFORM_SPECS[key].placeholder,
}));

function bareHost(url: URL): string {
  return url.hostname.toLowerCase().replace(/^(www|m)\./, "");
}

function tryParseUrl(raw: string): URL | null {
  // "instagram.com/leon" should parse like the link it clearly is.
  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw)
    ? raw
    : `https://${raw}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!url.hostname.includes(".")) return null;
    return url;
  } catch {
    return null;
  }
}

/**
 * "leon.m" is a handle with a dot, not a domain — so only read the input as a
 * URL when it says so (protocol, www., a path) or its host belongs to the
 * platform ("leon.substack.com").
 */
function readAsUrl(spec: PlatformSpec, raw: string): URL | null {
  const explicit =
    /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ||
    raw.startsWith("www.") ||
    raw.includes("/");
  const url = tryParseUrl(raw);
  if (!url) return null;
  return explicit || spec.isHost(bareHost(url)) ? url : null;
}

/**
 * Reduce whatever the user typed to the stored form: "" when empty, a bare
 * handle when the input is that platform's profile (typed or pasted), else
 * the URL itself so nothing they dropped in gets lost.
 */
export function normalizeSocialInput(
  platform: SocialPlatform,
  raw: string,
): string {
  const spec = PLATFORM_SPECS[platform];
  const trimmed = raw.trim();
  if (!trimmed) return "";

  const url = readAsUrl(spec, trimmed);
  if (url) {
    const handle = spec.isHost(bareHost(url)) ? spec.extract(url) : null;
    if (handle && spec.handle.test(handle)) return handle;
    return url.href.slice(0, MAX_STORED);
  }

  return trimmed.replace(/^@+/, "").slice(0, MAX_STORED);
}

/** Profile link for a stored value, or null when unset. */
export function socialProfileUrl(
  platform: SocialPlatform,
  stored: string | undefined,
): string | null {
  const value = stored?.trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return PLATFORM_SPECS[platform].url(value);
}

/** Human-sized version of the profile link: no protocol, no www, no trailing /. */
export function socialLinkLabel(
  platform: SocialPlatform,
  stored: string | undefined,
): string | null {
  const url = socialProfileUrl(platform, stored);
  if (!url) return null;
  return url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/+$/, "");
}

/** Normalize an API / storage payload into ProfileSocials. Unknown keys drop. */
export function parseProfileSocials(input: unknown): ProfileSocials {
  if (!input || typeof input !== "object") return {};
  const raw = input as Record<string, unknown>;
  const socials: ProfileSocials = {};
  for (const platform of SOCIAL_PLATFORMS) {
    const value = raw[platform];
    if (typeof value !== "string") continue;
    const cleaned = value.trim().slice(0, MAX_STORED);
    if (cleaned) socials[platform] = cleaned;
  }
  return socials;
}
