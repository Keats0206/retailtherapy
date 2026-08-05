import { getAdminUser } from "@/lib/auth";
import { listWaitlistSignups } from "@/lib/host-approvals";

// GET /api/admin/waitlist — list creator waitlist applications (admin only).
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { signups, counts } = await listWaitlistSignups();
    return Response.json({ signups, counts });
  } catch (err) {
    console.error("[admin/waitlist] list failed", err);
    return Response.json(
      { error: "Failed to load waitlist applications" },
      { status: 500 },
    );
  }
}
