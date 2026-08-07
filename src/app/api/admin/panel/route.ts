import { getAdminUser } from "@/lib/auth";
import { listLiveShowsForAdmin, listPastShowsForAdmin } from "@/lib/shows";

// GET /api/admin/panel — live and past shows for the admin control panel.
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const [liveShows, pastShows] = await Promise.all([
      listLiveShowsForAdmin(),
      listPastShowsForAdmin(),
    ]);
    return Response.json({ liveShows, pastShows });
  } catch (err) {
    console.error("[admin/panel] list failed", err);
    return Response.json(
      { error: "Failed to load admin panel" },
      { status: 500 },
    );
  }
}
