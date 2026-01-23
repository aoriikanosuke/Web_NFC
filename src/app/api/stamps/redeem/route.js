// src/app/api/stamps/redeem/route.js
import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function POST(request) {
  try {
    const { token } = await request.json();
    if (!token) {
      return NextResponse.json({ error: 'token が必要です。' }, { status: 400 });
    }

    const userId = request.cookies.get('nfc_user_id')?.value;
    if (!userId) {
      return NextResponse.json({ error: 'ログインが必要です。' }, { status: 401 });
    }

    const stampResult = await pool.query(
      `SELECT id, value AS points
       FROM stamps
       WHERE token = $1`,
      [token]
    );
    const stamp = stampResult.rows[0];
    if (!stamp) {
      return NextResponse.json({ error: '無効なトークンです。' }, { status: 404 });
    }

    const insertResult = await pool.query(
      `INSERT INTO user_stamps (user_id, stamp_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, stamp_id) DO NOTHING
       RETURNING stamp_id`,
      [userId, stamp.id]
    );

    const alreadyOwned = insertResult.rowCount === 0;
    if (insertResult.rowCount > 0) {
      await pool.query(
        'UPDATE users SET points = COALESCE(points, 0) + $1 WHERE id = $2',
        [stamp.points || 0, userId]
      );
    }

    const pointsResult = await pool.query(
      'SELECT points FROM users WHERE id = $1',
      [userId]
    );
    const stampsResult = await pool.query(
      'SELECT stamp_id FROM user_stamps WHERE user_id = $1',
      [userId]
    );

    return NextResponse.json({
      ok: true,
      alreadyOwned,
      points: pointsResult.rows[0]?.points ?? 0,
      stamp_progress: stampsResult.rows.map((row) => row.stamp_id),
    });
  } catch (error) {
    console.error("[redeem] error:", error); 
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
