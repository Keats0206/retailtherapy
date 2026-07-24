import { deleteProspect, updateProspect } from "@/lib/creator-outreach";
import type { OutreachStatus } from "@/lib/outreach-status";
import { OUTREACH_STATUSES } from "@/lib/outreach-status";
import { isValidEmail } from "@/lib/waitlist";

function isStatus(value: unknown): value is OutreachStatus {
  return (
    typeof value === "string" &&
    (OUTREACH_STATUSES as readonly string[]).includes(value)
  );
}

// PATCH /api/admin/creator-outreach/<id> — edit a prospect's status, contact
// address, notes, or saved draft. Ungated for now, same as the page it backs.
export async function PATCH(
  request: Request,
  { params }: RouteContext<"/api/admin/creator-outreach/[id]">,
) {
  const { id } = await params;

  let body: {
    status?: unknown;
    email?: unknown;
    notes?: unknown;
    draftSubject?: unknown;
    draftBody?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const patch: Parameters<typeof updateProspect>[1] = {};

  if (body.status !== undefined) {
    if (!isStatus(body.status)) {
      return Response.json({ error: "Unknown status" }, { status: 400 });
    }
    patch.status = body.status;
  }

  if (body.email !== undefined) {
    // Empty string clears the address; anything else has to look like one, or
    // the send step fails later with a much less obvious error.
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (email && !isValidEmail(email)) {
      return Response.json(
        { error: "Enter a valid email address" },
        { status: 400 },
      );
    }
    patch.email = email || null;
  }

  if (body.notes !== undefined) {
    patch.notes = typeof body.notes === "string" ? body.notes.trim() || null : null;
  }
  if (body.draftSubject !== undefined) {
    patch.draftSubject =
      typeof body.draftSubject === "string"
        ? body.draftSubject.trim() || null
        : null;
  }
  if (body.draftBody !== undefined) {
    patch.draftBody =
      typeof body.draftBody === "string" ? body.draftBody.trim() || null : null;
  }

  if (Object.keys(patch).length === 0) {
    return Response.json({ error: "Nothing to update" }, { status: 400 });
  }

  const prospect = await updateProspect(id, patch);
  if (!prospect) {
    return Response.json({ error: "Prospect not found" }, { status: 404 });
  }

  return Response.json({ prospect });
}

// DELETE /api/admin/creator-outreach/<id> — drop a prospect from the list.
// Ungated for now, same as the page it backs.
export async function DELETE(
  _request: Request,
  { params }: RouteContext<"/api/admin/creator-outreach/[id]">,
) {
  const { id } = await params;
  await deleteProspect(id);
  return Response.json({ ok: true });
}
