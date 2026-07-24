import { countProspectsByStatus, listProspects } from "@/lib/creator-outreach";

// GET /api/admin/creator-outreach — the current prospect list. Ungated for now,
// same as the page it backs.
// The page server-renders the same data; this exists so the client can refresh
// after a search or a send without a full navigation.
export async function GET() {
  const [prospects, counts] = await Promise.all([
    listProspects(),
    countProspectsByStatus(),
  ]);

  return Response.json({ prospects, counts });
}
