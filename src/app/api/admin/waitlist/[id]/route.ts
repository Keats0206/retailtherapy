import { getAdminUser } from "@/lib/auth";
import { reviewWaitlistSignup } from "@/lib/host-approvals";

// PATCH /api/admin/waitlist/<id> — approve or decline an application.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminUser();
  if (!admin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  let body: { action?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (body.action !== "approve" && body.action !== "decline") {
    return Response.json({ error: "Unknown action" }, { status: 400 });
  }

  try {
    const updated = await reviewWaitlistSignup(id, body.action, admin.id);
    if (!updated) {
      return Response.json({ error: "Application not found" }, { status: 404 });
    }
    return Response.json(updated);
  } catch (err) {
    console.error("[admin/waitlist] review failed", err);
    return Response.json(
      { error: "Failed to update this application" },
      { status: 500 },
    );
  }
}
