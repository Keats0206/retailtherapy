import { getSignedInUser } from "@/lib/auth";
import { getProspect, updateProspect } from "@/lib/creator-outreach";
import { draftOutreachEmail } from "@/lib/outreach-draft";
import { checkRateLimit, clientIp, rateLimitResponse } from "@/lib/rate-limit";

// POST /api/admin/creator-outreach/<id>/draft — write an outreach email for one
// prospect. Ungated for now, same as the page it backs. Saves the draft but
// never sends it; sending is a separate, explicit call.
export async function POST(
  request: Request,
  { params }: RouteContext<"/api/admin/creator-outreach/[id]/draft">,
) {
  // Drafting costs a model call, so cap it. No sign-in required now that this
  // is open, so key on IP.
  const limit = checkRateLimit(`creator-draft:${clientIp(request)}`, {
    limit: 30,
    windowMs: 60_000,
  });
  if (!limit.ok) {
    return rateLimitResponse(limit.retryAfterSec ?? 60);
  }

  const { id } = await params;
  const prospect = await getProspect(id);
  if (!prospect) {
    return Response.json({ error: "Prospect not found" }, { status: 404 });
  }

  let body: { angle?: string };
  try {
    body = (await request.json()) as { angle?: string };
  } catch {
    body = {};
  }

  // Sign-in is optional here, but personalize the signature when we do have a
  // user rather than falling straight back to the generic name.
  const sender = await getSignedInUser();
  const senderName =
    sender?.firstName ??
    sender?.username ??
    sender?.emailAddresses[0]?.emailAddress ??
    "the frontrow team";

  try {
    const draft = await draftOutreachEmail(prospect, {
      senderName,
      angle: body.angle?.trim() || null,
    });

    // Only advance `new` → `drafted`. A prospect already contacted or replied
    // shouldn't slide backwards because someone regenerated the copy.
    const updated = await updateProspect(id, {
      draftSubject: draft.subject,
      draftBody: draft.body,
      ...(prospect.status === "new" ? { status: "drafted" as const } : {}),
    });

    return Response.json({ draft, prospect: updated });
  } catch (err) {
    console.error("[creator-outreach] draft failed", err);
    const message =
      err instanceof Error ? err.message : "Failed to write the draft";
    return Response.json({ error: message }, { status: 500 });
  }
}
