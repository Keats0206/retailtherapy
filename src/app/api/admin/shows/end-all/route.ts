import { getAdminUser } from "@/lib/auth";
import { endAllLiveShows } from "@/lib/shows";

// POST /api/admin/shows/end-all — force-end every live show (admin only).
export async function POST() {
  const admin = await getAdminUser();
  if (!admin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const endedSlugs = await endAllLiveShows();
    return Response.json({ ended: endedSlugs, count: endedSlugs.length });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to end live shows";
    return Response.json({ error: message }, { status: 500 });
  }
}
