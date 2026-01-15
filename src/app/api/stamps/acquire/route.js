// src/app/api/stamps/acquire/route.js
import { NextResponse } from "next/server";
import { Pool } from "pg";

export const runtime = "nodejs"; // pgを使うのでnode固定

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function computePoints(client, userId) {
  const { rows } = await client.query(
    `
    SELECT COALESCE(SUM(w.value), 0)::int AS points
    FROM user_stamps us
    JOIN web_nfc w ON w.id = us.stamp_id
    WHERE us.user_id = $1
    `,
    [userId]
  );
  return rows[0]?.points ?? 0;
}

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
      JOIN web_nfc w ON w.id = us.stamp_id
      WHERE us.user_id = $1
      ORDER BY us.acquired_at ASC
      `,
      [userId]
    );

    const points = await computePoints(client, userId);

    // users.points を常に整合させたいならここで更新（任意だけど便利）
    await client.query(`UPDATE users SET points = $2 WHERE id = $1`, [userId, points]);

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

    // 1) uid -> web_nfc.id/value 取得
    const stampRes = await client.query(
      `
      SELECT id, uid, name, value
      FROM web_nfc
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
    // ※(user_id, stamp_id) に UNIQUE か PK がある前提だと安全
    let acquired = false;
    try {
      const ins = await client.query(
        `
        INSERT INTO user_stamps (user_id, stamp_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, stamp_id) DO NOTHING
        RETURNING acquired_at
        `,
        [userId, stamp.id]
      );
      acquired = ins.rowCount === 1;
    } catch (err) {
      // UNIQUEが無い環境用フォールバック（最低限の重複防止）
      const exists = await client.query(
        `SELECT 1 FROM user_stamps WHERE user_id = $1 AND stamp_id = $2 LIMIT 1`,
        [userId, stamp.id]
      );
      if (exists.rowCount === 0) {
        await client.query(
          `INSERT INTO user_stamps (user_id, stamp_id) VALUES ($1, $2)`,
          [userId, stamp.id]
        );
        acquired = true;
      }
    }

    // 3) points 再計算して users.points を更新
    const points = await computePoints(client, userId);
    const upd = await client.query(
      `UPDATE users SET points = $2 WHERE id = $1 RETURNING points`,
      [userId, points]
    );

    await client.query("COMMIT");

    return NextResponse.json({
      userId,
      acquired,
      stamp,
      points: upd.rows[0]?.points ?? points,
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
