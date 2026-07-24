// Legacy Mux CRUD — superseded by /api/shows. Disabled in production.
export async function POST() {
  return Response.json(
    { error: "Use POST /api/shows instead" },
    { status: 410 },
  );
}

export async function GET() {
  return Response.json(
    { error: "Use GET /api/shows?status=live instead" },
    { status: 410 },
  );
}
