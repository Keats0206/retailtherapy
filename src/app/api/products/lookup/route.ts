import { isHost } from "@/lib/auth";
import { LookupError, lookupProduct } from "@/lib/channel3";

// POST /api/products/lookup — resolve a retailer product URL via Channel3.
// Body: { url: string }.
//
// Host-only: every call spends Channel3 credits, so this is gated on the
// HOST_ALLOWLIST rather than left open to any viewer.
export async function POST(request: Request) {
  let host = false;
  try {
    host = await isHost();
  } catch {
    // Clerk unconfigured — treat as anonymous, which fails the gate below.
    host = false;
  }

  if (!host) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const url = body.url?.trim();
  if (!url) {
    return Response.json({ error: "Missing url" }, { status: 400 });
  }

  try {
    const product = await lookupProduct(url);
    return Response.json({ product });
  } catch (err) {
    if (err instanceof LookupError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    return Response.json({ error: "Lookup failed" }, { status: 500 });
  }
}
