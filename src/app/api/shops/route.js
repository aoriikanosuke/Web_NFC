import { NextResponse } from "next/server";
import { Pool } from "pg";

export const runtime = "nodejs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET() {
  const client = await pool.connect();
  try {
    const res = await client.query(
      `
      SELECT id, name, uid, token, location, points, created_at
      FROM shop
      ORDER BY id ASC
      `
    );
    return NextResponse.json({ ok: true, shops: res.rows });
  } catch (error) {
    console.error("GET /api/shops error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to load shops." },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

