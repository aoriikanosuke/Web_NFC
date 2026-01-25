// src/app/api/stamps/reset/route.js
import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function resetUserStamps(userId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // user_stamps を全削除
    const del = await client.query(
      "DELETE FROM user_stamps WHERE user_id = $1",
      [userId]
    );

    // points を 0 に戻す（DB表示用）& bonus_Claimed を false に戻す
    const upd = await client.query(
      "UPDATE users SET points = 0, bonus_claimed = false, bonus_claimed_at = NULL WHERE id = $1 RETURNING id, username, points, bonus_claimed, bonus_claimed_at",
      [userId]
    );

    await client.query("COMMIT");

    return {
      deletedCount: del.rowCount || 0,
      user: upd.rows[0] || { id: userId, points: 0 },
    };
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch {}
    throw e;
  } finally {
    client.release();
  }
}

// POSTでもDELETEでも呼べるようにしておく（好みで片方だけでもOK）
export async function POST(request) {
  try {
    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }
    const result = await resetUserStamps(userId);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: "サーバーエラーが発生しました。" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }
    const result = await resetUserStamps(userId);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: "サーバーエラーが発生しました。" }, { status: 500 });
  }
}
