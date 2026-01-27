// src/app/api/stamps/redeem/route.js
import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function POST(request) {
  const client = await pool.connect();
  try {
    const { token } = await request.json();
    if (!token) {
      return NextResponse.json({ error: 'token is required' }, { status: 400 });
    }

    const userId = request.cookies.get('nfc_user_id')?.value;
    if (!userId) {
      return NextResponse.json({ error: 'login is required' }, { status: 401 });
    }

    const stampResult = await client.query(
      `SELECT id, name, value AS points
       FROM stamps
       WHERE token = $1`,
      [token]
    );
    const stamp = stampResult.rows[0];
    if (!stamp) {
      return NextResponse.json({ error: 'invalid token' }, { status: 404 });
    }

    await client.query('BEGIN');

    const insertResult = await client.query(
      `INSERT INTO user_stamps (user_id, stamp_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, stamp_id) DO NOTHING
       RETURNING stamp_id`,
      [userId, stamp.id]
    );

    const alreadyOwned = insertResult.rowCount === 0;
    if (!alreadyOwned) {
      const upd = await client.query(
        'UPDATE users SET points = COALESCE(points, 0) + $1 WHERE id = $2 RETURNING points',
        [stamp.points || 0, userId]
      );
      const nextPoints = upd.rows[0]?.points ?? 0;

      await client.query(
        `
        INSERT INTO point_logs (user_id, delta, balance_after, action, ref_type, ref_id, note)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          userId,
          Number(stamp.points) || 0,
          nextPoints,
          'stamp_acquire',
          'stamp',
          stamp.id,
          stamp.name || 'WebNFC stamp acquire',
        ]
      );

      await client.query(
        `
        WITH ranked AS (
          SELECT id,
                 ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC, id DESC) AS rn
          FROM point_logs
          WHERE user_id = $1
        )
        DELETE FROM point_logs
        WHERE id IN (SELECT id FROM ranked WHERE rn > 20)
        `,
        [userId]
      );
    }

    const pointsResult = await client.query('SELECT points FROM users WHERE id = $1', [userId]);
    const stampsResult = await client.query('SELECT stamp_id FROM user_stamps WHERE user_id = $1', [userId]);

    await client.query('COMMIT');

    return NextResponse.json({
      ok: true,
      alreadyOwned,
      points: pointsResult.rows[0]?.points ?? 0,
      stamp_progress: stampsResult.rows.map((row) => row.stamp_id),
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {}
    console.error('[redeem] error:', error);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  } finally {
    client.release();
  }
}
