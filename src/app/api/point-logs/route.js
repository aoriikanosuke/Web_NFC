import { NextResponse } from "next/server";
import { Pool } from "pg";

export const runtime = "nodejs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function isValidUUID(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId || !isValidUUID(userId)) {
    return NextResponse.json({ ok: false, error: "userId が不正です。" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    const res = await client.query(
      `
      SELECT id, delta, balance_after, action, ref_type, ref_id, note, created_at
      FROM point_logs
      WHERE user_id = $1
      ORDER BY created_at DESC, id DESC
      LIMIT 20
      `,
      [userId]
    );
    return NextResponse.json({ ok: true, logs: res.rows });
  } catch (e) {
    return NextResponse.json({ ok: false, error: "取引ログの取得に失敗しました。" }, { status: 500 });
  } finally {
    client.release();
  }
}
