import { getAdminUser } from "@/lib/auth";
import { getProspect, updateProspect } from "@/lib/creator-outreach";
import { draftOutreachEmail } from "@/lib/outreach-draft";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

// POST /api/admin/creator-outreach/<id>/draft — write an outreach email for one
// prospect (admin only). Saves the draft but never sends it; sending is a
// separate, explicit call.
export async function POST(
  request: Request,
  { params }: RouteContext<"/api/admin/creator-outreach/[id]/draft">,
) {
  const admin = await getAdminUser();
  if (!admin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const limit = checkRateLimit(`creator-draft:${admin.id}`, {
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

  const senderName =
    admin.firstName ??
    admin.username ??
    admin.emailAddresses[0]?.emailAddress ??
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
