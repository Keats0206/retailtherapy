import {
  checkRateLimit,
  clientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { searchShows } from "@/lib/show-search";

// GET /api/search?q=linen+blazer&limit=10 — semantic search over ended shows.

export async function GET(request: Request) {
  const ip = clientIp(request);
  const limit = checkRateLimit(`search:${ip}`, {
    limit: 30,
    windowMs: 60_000,
  });
  if (!limit.ok) {
    return rateLimitResponse(limit.retryAfterSec ?? 60);
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const rawLimit = Number(searchParams.get("limit") ?? "10");
  const cappedLimit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(Math.trunc(rawLimit), 1), 20)
    : 10;

  if (query.length < 2) {
    return Response.json(
      { error: "Query must be at least 2 characters" },
      { status: 400 },
    );
  }

  if (query.length > 200) {
    return Response.json(
      { error: "Query must be at most 200 characters" },
      { status: 400 },
    );
  }

  try {
    const results = await searchShows(query, cappedLimit);
    return Response.json({ results });
  } catch {
    return Response.json({ error: "Search unavailable" }, { status: 503 });
  }
}
