import { getAdminUser } from "@/lib/auth";
import { deleteShowAsAdmin, getShowBySlug } from "@/lib/shows";

// DELETE /api/admin/shows/<slug> — remove any finished show (admin only).
export async function DELETE(
  _request: Request,
  { params }: RouteContext<"/api/admin/shows/[slug]">,
) {
  const admin = await getAdminUser();
  if (!admin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { slug } = await params;
  const show = await getShowBySlug(slug);
  if (!show) {
    return Response.json({ error: "Show not found" }, { status: 404 });
  }

  if (show.status === "live") {
    return Response.json(
      { error: "Close the show before deleting it" },
      { status: 409 },
    );
  }

  try {
    const deleted = await deleteShowAsAdmin(slug);
    if (!deleted) {
      return Response.json({ error: "Show not found" }, { status: 404 });
    }
    return Response.json({ slug: deleted.slug });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete the show";
    return Response.json({ error: message }, { status: 500 });
  }
}
