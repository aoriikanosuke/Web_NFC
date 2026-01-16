import { NextResponse } from "next/server";
import { Pool } from "pg";

export const runtime = "nodejs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET() {
  try {
    const result = await pool.query(
      `
      SELECT
        u.username,
        COALESCE(u.points, 0) AS points,
        COALESCE(s.stamp_count, 0) AS stamp_count
      FROM users u
      LEFT JOIN (
        SELECT user_id, COUNT(*)::int AS stamp_count
        FROM user_stamps
        GROUP BY user_id
      ) s ON s.user_id = u.id
      ORDER BY stamp_count DESC, points DESC, username ASC
      LIMIT 50
      `
    );
    return NextResponse.json({ ranking: result.rows });
  } catch (e) {
    return NextResponse.json({ error: "ランキング取得に失敗しました。" }, { status: 500 });
  }
}
