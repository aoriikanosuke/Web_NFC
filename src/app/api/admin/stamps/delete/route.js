import { NextResponse } from "next/server";
import { Pool } from "pg";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";

export const runtime = "nodejs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function POST(request) {
  const session = getAdminSessionFromRequest(request);
  if (!session.ok) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const client = await pool.connect();
  try {
    const body = await request.json().catch(() => ({}));
    const stampId = body?.stampId ?? null;

    if (!stampId) {
      return NextResponse.json({ ok: false, error: "stampId is required." }, { status: 400 });
    }

    await client.query("BEGIN");

    // FK対策：進捗参照（user_stamps）は先に掃除する
    await client.query("DELETE FROM user_stamps WHERE stamp_id = $1", [stampId]);

    const res = await client.query(
      `
      DELETE FROM stamps
      WHERE id = $1
      RETURNING id, name, uid, token
      `,
      [stampId]
    );

    if (res.rowCount === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: false, error: "Stamp not found." }, { status: 404 });
    }

    await client.query("COMMIT");
    return NextResponse.json({ ok: true, stamp: res.rows[0] });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    console.error("admin/stamps/delete error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to delete stamp." },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
