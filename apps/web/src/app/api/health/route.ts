// Health check for uptime monitoring: answers `{ status: "ok" }` without touching the database.

export async function GET() {
  return Response.json({ status: "ok" });
}
