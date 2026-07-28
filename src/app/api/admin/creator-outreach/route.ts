import { getAdminUser } from "@/lib/auth";
import { countProspectsByStatus, listProspects } from "@/lib/creator-outreach";

// GET /api/admin/creator-outreach — the current prospect list (admin only).
// The page server-renders the same data; this exists so the client can refresh
// after a search or a send without a full navigation.
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const [prospects, counts] = await Promise.all([
    listProspects(),
    countProspectsByStatus(),
  ]);

  return Response.json({ prospects, counts });
}
