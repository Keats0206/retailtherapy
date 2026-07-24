import "server-only";

/**
 * Read-only TikTok account lookup, used by /admin/creator-outreach to source
 * hosts. Goes through the `tiktok-api23` RapidAPI proxy — TikTok's own API has
 * no public account-search, and this endpoint returns the profile bio, which is
 * the only place creators publish a contact address.
 *
 * Everything here is public profile data: handle, display name, bio, avatar and
 * follower count. We never touch private endpoints or authenticate as a user.
 */

const RAPIDAPI_HOST = "tiktok-api23.p.rapidapi.com";
const BASE_URL = `https://${RAPIDAPI_HOST}`;

export type TikTokAccount = {
  platformUserId: string | null;
  handle: string;
  displayName: string | null;
  bio: string | null;
  bioLink: string | null;
  avatarUrl: string | null;
  followerCount: number;
  verified: boolean;
  /** First contact address found in the bio, if any. */
  email: string | null;
  profileUrl: string;
};

export type TikTokSearchResult = {
  accounts: TikTokAccount[];
  /** Feed back into `searchAccounts` to page; null when there's nothing left. */
  nextCursor: number | null;
};

export class TikTokApiError extends Error {}

function apiKey(): string {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) {
    throw new TikTokApiError(
      "RAPIDAPI_KEY is not set. Add it to .env.local — see .env.example.",
    );
  }
  return key;
}

/**
 * Bios are written by humans, so addresses show up as "hi@x.com", "hi (at)
 * x.com", and "📩 hi@x.com". Match the plain form first, then the obfuscated
 * one, and normalize both. Deliberately not RFC-strict: a false positive is
 * visible in the UI and editable, a false negative silently loses a lead.
 */
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const OBFUSCATED_EMAIL_RE =
  /([A-Za-z0-9._%+-]+)\s*(?:\(at\)|\[at\]|\s+at\s+)\s*([A-Za-z0-9.-]+)\s*(?:\(dot\)|\[dot\]|\s+dot\s+|\.)\s*([A-Za-z]{2,})/i;

export function extractEmail(bio: string | null | undefined): string | null {
  if (!bio) return null;

  const direct = bio.match(EMAIL_RE);
  if (direct) return direct[0].toLowerCase().replace(/[.,;:]+$/, "");

  const obfuscated = bio.match(OBFUSCATED_EMAIL_RE);
  if (obfuscated) {
    return `${obfuscated[1]}@${obfuscated[2]}.${obfuscated[3]}`.toLowerCase();
  }

  return null;
}

async function request<T>(path: string, params: Record<string, string>) {
  const url = new URL(path, BASE_URL);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url, {
    headers: {
      "x-rapidapi-host": RAPIDAPI_HOST,
      "x-rapidapi-key": apiKey(),
    },
    // Sourcing is a live query; a cached page of creators is worse than useless.
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new TikTokApiError(
      `TikTok search failed (${res.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`,
    );
  }

  return (await res.json()) as T;
}

/** Shape of one entry in `/api/search/account`'s `user_list`. */
type SearchUserInfo = {
  uid?: string;
  unique_id?: string;
  nickname?: string;
  signature?: string;
  follower_count?: number;
  custom_verify?: string;
  enterprise_verify_reason?: string;
  avatar_thumb?: { url_list?: string[] };
};

type SearchResponse = {
  user_list?: { user_info?: SearchUserInfo }[];
  cursor?: number;
  has_more?: boolean;
};

function toAccount(info: SearchUserInfo): TikTokAccount | null {
  const handle = info.unique_id?.trim().toLowerCase();
  if (!handle) return null;

  const bio = info.signature?.trim() || null;

  return {
    platformUserId: info.uid ?? null,
    handle,
    displayName: info.nickname?.trim() || null,
    bio,
    bioLink: null,
    avatarUrl: info.avatar_thumb?.url_list?.[0] ?? null,
    followerCount: info.follower_count ?? 0,
    // The API reports verification as a non-empty reason string, not a boolean.
    verified: Boolean(
      info.custom_verify?.trim() || info.enterprise_verify_reason?.trim(),
    ),
    email: extractEmail(bio),
    profileUrl: `https://www.tiktok.com/@${handle}`,
  };
}

/**
 * Search public accounts by keyword. `cursor` is 0 for the first page and then
 * whatever the previous call returned as `nextCursor`.
 */
export async function searchAccounts(
  keyword: string,
  cursor = 0,
): Promise<TikTokSearchResult> {
  const trimmed = keyword.trim();
  if (!trimmed) return { accounts: [], nextCursor: null };

  const data = await request<SearchResponse>("/api/search/account", {
    keyword: trimmed,
    cursor: String(cursor),
    search_id: "0",
  });

  const accounts = (data.user_list ?? [])
    .map((entry) => (entry.user_info ? toAccount(entry.user_info) : null))
    .filter((account): account is TikTokAccount => account !== null);

  return {
    accounts,
    nextCursor: data.has_more && typeof data.cursor === "number"
      ? data.cursor
      : null,
  };
}

type UserInfoResponse = {
  userInfo?: {
    user?: {
      id?: string;
      uniqueId?: string;
      nickname?: string;
      signature?: string;
      verified?: boolean;
      avatarMedium?: string;
      avatarThumb?: string;
      bioLink?: { link?: string };
    };
    stats?: { followerCount?: number };
  };
};

/**
 * Full profile for one handle. Search results already carry the bio, so this is
 * only worth calling for a prospect you're about to email — it adds the bio
 * link and a fresher follower count.
 */
export async function getAccount(
  handle: string,
): Promise<TikTokAccount | null> {
  const uniqueId = handle.trim().replace(/^@/, "").toLowerCase();
  if (!uniqueId) return null;

  const data = await request<UserInfoResponse>("/api/user/info", { uniqueId });
  const user = data.userInfo?.user;
  if (!user?.uniqueId) return null;

  const bio = user.signature?.trim() || null;

  return {
    platformUserId: user.id ?? null,
    handle: user.uniqueId.toLowerCase(),
    displayName: user.nickname?.trim() || null,
    bio,
    bioLink: user.bioLink?.link ?? null,
    avatarUrl: user.avatarMedium ?? user.avatarThumb ?? null,
    followerCount: data.userInfo?.stats?.followerCount ?? 0,
    verified: Boolean(user.verified),
    email: extractEmail(bio),
    profileUrl: `https://www.tiktok.com/@${user.uniqueId.toLowerCase()}`,
  };
}
