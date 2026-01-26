// src/app/api/stamps/acquire/route.js
import { NextResponse } from "next/server";
import { Pool } from "pg";

export const runtime = "nodejs"; // pgを使うのでnode固定

const pool = new Pool({ connectionString: process.env.DATABASE_URL });



export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    const stampsRes = await client.query(
      `
      SELECT
        w.id, w.uid, w.name, w.value,
        us.acquired_at
      FROM user_stamps us
      JOIN stamps w ON w.id = us.stamp_id
      WHERE us.user_id = $1
      ORDER BY us.acquired_at ASC
      `,
      [userId]
    );

    const pointsRes = await client.query(
      `SELECT points FROM users WHERE id = $1`,
      [userId]
    );
    const points = pointsRes.rows[0]?.points ?? 0;

    return NextResponse.json({
      userId,
      points,
      stamps: stampsRes.rows,
      acquiredUids: stampsRes.rows.map((r) => r.uid),
    });
  } catch (e) {
    return NextResponse.json({ error: "サーバーエラーが発生しました。" }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(request) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const userId = body?.userId;
    const uid = body?.uid;

    if (!userId || !uid) {
      return NextResponse.json({ error: "userId and uid are required" }, { status: 400 });
    }

    await client.query("BEGIN");

    // 1) uid -> stamps.id/value 取得
    const stampRes = await client.query(
      `
      SELECT id, uid, name, value
      FROM stamps
      WHERE UPPER(uid) = UPPER($1)
      LIMIT 1
      `,
      [uid]
    );

    const stamp = stampRes.rows[0];
    if (!stamp) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "未登録のUIDです。" }, { status: 404 });
    }

    // 2) user_stamps にINSERT（重複は無視）
    const { rowCount } = await client.query(
      `
      INSERT INTO user_stamps (user_id, stamp_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, stamp_id) DO NOTHING
      RETURNING acquired_at
      `,
      [userId, stamp.id]
    );

    const acquired = rowCount === 1;

    // 3) points 計算して users.points を更新
    let points = 0;
    if (acquired) {
      const upd = await client.query(
        `UPDATE users SET points = COALESCE(points, 0) + $2 WHERE id = $1 RETURNING points`,
        [userId, Number(stamp.value) || 0]
      );
      points = upd.rows[0]?.points ?? 0;
    } else {
      const pointsRes = await client.query(
        `SELECT points FROM users WHERE id = $1`,
        [userId]
      );
      points = pointsRes.rows[0]?.points ?? 0;
    }

    await client.query("COMMIT");

    return NextResponse.json({
      userId,
      acquired,
      stamp,
      points,
    });
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    return NextResponse.json({ error: "サーバーエラーが発生しました。" }, { status: 500 });
  } finally {
    client.release();
  }
}