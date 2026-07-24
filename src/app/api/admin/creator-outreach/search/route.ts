import { getAdminUser } from "@/lib/auth";
import { importProspects } from "@/lib/creator-outreach";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { TikTokApiError, searchAccounts } from "@/lib/tiktok";

// POST /api/admin/creator-outreach/search — find TikTok creators by keyword and
// save them as prospects (admin only).
//
// Returns the accounts it found so the UI can show them immediately, including
// the ones with no public email — those are still worth seeing, they just can't
// be emailed.
export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // The upstream API is metered per call, so cap how fast one admin can burn it.
  const limit = checkRateLimit(`creator-search:${admin.id}`, {
    limit: 20,
    windowMs: 60_000,
  });
  if (!limit.ok) {
    return rateLimitResponse(limit.retryAfterSec ?? 60);
  }

  let body: { keyword?: string; cursor?: number };
  try {
    body = (await request.json()) as { keyword?: string; cursor?: number };
  } catch {
    body = {};
  }

  const keyword = body.keyword?.trim() ?? "";
  if (!keyword) {
    return Response.json(
      { error: "Enter a keyword to search" },
      { status: 400 },
    );
  }

  try {
    const { accounts, nextCursor } = await searchAccounts(
      keyword,
      body.cursor ?? 0,
    );
    const imported = await importProspects(accounts, keyword);

    return Response.json({
      accounts,
      imported,
      withEmail: accounts.filter((account) => account.email).length,
      nextCursor,
    });
  } catch (err) {
    if (err instanceof TikTokApiError) {
      return Response.json({ error: err.message }, { status: 502 });
    }
    console.error("[creator-outreach] search failed", err);
    return Response.json({ error: "Search failed" }, { status: 500 });
  }
}
