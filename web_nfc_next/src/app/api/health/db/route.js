import { sql } from "@/lib/db";

export async function GET() {
  const r = await sql`SELECT NOW() as now`;
  return Response.json({ ok: true, now: r.rows[0].now });
}
