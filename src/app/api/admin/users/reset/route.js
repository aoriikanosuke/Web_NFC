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
    const userId = body?.userId;
    if (!userId) {
      return NextResponse.json({ ok: false, error: "userId が必要です。" }, { status: 400 });
    }

    await client.query("BEGIN");
    await client.query("DELETE FROM user_stamps WHERE user_id = $1", [userId]);
    await client.query("DELETE FROM point_logs WHERE user_id = $1", [userId]);
    const upd = await client.query(
      "UPDATE users SET points = 0, bonus_claimed = false, bonus_claimed_at = NULL WHERE id = $1 RETURNING points",
      [userId]
    );
    await client.query("COMMIT");

    return NextResponse.json({ ok: true, points: upd.rows[0]?.points ?? 0 });
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    return NextResponse.json({ ok: false, error: "ユーザーリセットに失敗しました。" }, { status: 500 });
  } finally {
    client.release();
  }
}
