import { NextResponse } from "next/server";
import { Pool } from "pg";

export const runtime = "nodejs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const BONUS_AMOUNT = 100;

export async function POST(request) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const userId = body?.userId;
    if (!userId) {
      return NextResponse.json({ ok: false, error: "userId が必要です。" }, { status: 400 });
    }

    await client.query("BEGIN");
    const currentRes = await client.query(
      "SELECT points FROM users WHERE id = $1 FOR UPDATE",
      [userId]
    );
    if (currentRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: false, error: "ユーザーが見つかりません。" }, { status: 404 });
    }

    const nextPoints = Number(currentRes.rows[0]?.points || 0) + BONUS_AMOUNT;
    const upd = await client.query(
      "UPDATE users SET points = $2 WHERE id = $1 RETURNING points",
      [userId, nextPoints]
    );
    await client.query("COMMIT");

    return NextResponse.json({
      ok: true,
      points: upd.rows[0]?.points ?? nextPoints,
      bonus: BONUS_AMOUNT,
    });
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    return NextResponse.json({ ok: false, error: "ボーナス付与に失敗しました。" }, { status: 500 });
  } finally {
    client.release();
  }
}
