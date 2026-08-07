import { getAdminUser } from "@/lib/auth";
import { getMetrics, parseRange } from "@/lib/metrics";

// GET /api/admin/metrics?range=30d — platform metrics for the admin dashboard.
export async function GET(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const range = parseRange(searchParams.get("range") ?? undefined);

  try {
    const metrics = await getMetrics(range);
    return Response.json(metrics);
  } catch (err) {
    console.error("[admin/metrics] load failed", err);
    return Response.json(
      { error: "Failed to load metrics" },
      { status: 500 },
    );
  }
}
