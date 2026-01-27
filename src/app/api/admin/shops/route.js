import { NextResponse } from "next/server";
import { Pool } from "pg";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";

export const runtime = "nodejs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET(request) {
  const session = getAdminSessionFromRequest(request);
  if (!session.ok) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const client = await pool.connect();
  try {
    const res = await client.query(
      `
      SELECT id, name, uid, token, points, location, created_at
      FROM shop
      ORDER BY id ASC
      `
    );
    return NextResponse.json({ ok: true, shops: res.rows });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "Failed to load shops." },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
