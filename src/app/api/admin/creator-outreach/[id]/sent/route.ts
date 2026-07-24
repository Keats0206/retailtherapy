import { getProspect, markContacted } from "@/lib/creator-outreach";

// POST /api/admin/creator-outreach/<id>/sent — record that the operator actually
// emailed this creator. Ungated for now, same as the page it backs.
//
// Outreach goes out through the operator's own Gmail, so the app never observes
// the send. This is the human confirming it happened, which is why it's a
// separate deliberate action rather than a side effect of opening the composer.
export async function POST(
  _request: Request,
  { params }: RouteContext<"/api/admin/creator-outreach/[id]/sent">,
) {
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
