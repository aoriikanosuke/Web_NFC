import { NextResponse } from "next/server";
import { Pool } from "pg";

export const runtime = "nodejs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function POST(request) {
  const client = await pool.connect();
  try {
    const body = await request.json().catch(() => ({}));
    const uid = body?.uid ? String(body.uid) : "";
    const token = body?.token ? String(body.token) : "";

    if (!uid && !token) {
      return NextResponse.json({ ok: false, error: "uid ‚Ü‚½‚Í token ‚ª•K—v‚Å‚·B" }, { status: 400 });
    }

    const key = uid || token;
    const res = await client.query(
      "SELECT id, name, points, location FROM shop WHERE uid = $1 OR token = $1 LIMIT 1",
      [key]
    );

    if (res.rowCount === 0) {
      return NextResponse.json({ ok: false, error: "–¢“o˜^‚ÌNFC‚Å‚·B" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, shop: res.rows[0] });
  } catch (e) {
    return NextResponse.json({ ok: false, error: "“X•Ü‚Ìæ“¾‚É¸”s‚µ‚Ü‚µ‚½B" }, { status: 500 });
  } finally {
    client.release();
  }
}
