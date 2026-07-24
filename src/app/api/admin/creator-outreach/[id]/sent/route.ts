import { getAdminUser } from "@/lib/auth";
import { getProspect, markContacted } from "@/lib/creator-outreach";

// POST /api/admin/creator-outreach/<id>/sent — record that the admin actually
// emailed this creator (admin only).
//
// Outreach goes out through the admin's own Gmail, so the app never observes
// the send. This is the human confirming it happened, which is why it's a
// separate deliberate action rather than a side effect of opening the composer.
export async function POST(
  _request: Request,
  { params }: RouteContext<"/api/admin/creator-outreach/[id]/sent">,
) {
  const admin = await getAdminUser();
  if (!admin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const prospect = await getProspect(id);
  if (!prospect) {
    return Response.json({ error: "Prospect not found" }, { status: 404 });
  }
  if (!prospect.draftSubject || !prospect.draftBody) {
    return Response.json(
      { error: "Nothing was drafted for this creator" },
      { status: 400 },
    );
  }

  const updated = await markContacted(id, {
    subject: prospect.draftSubject,
    body: prospect.draftBody,
  });

  return Response.json({ prospect: updated });
}
