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
    const amount = Number(body?.amount);

    if (!userId || !Number.isFinite(amount) || amount <= 0 || !Number.isInteger(amount)) {
      return NextResponse.json({ ok: false, error: "userId と amount が必要です。" }, { status: 400 });
    }

    await client.query("BEGIN");

    const cur = await client.query("SELECT points FROM users WHERE id = $1 FOR UPDATE", [userId]);
    if (cur.rowCount === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: false, error: "ユーザーが見つかりません。" }, { status: 404 });
    }

    const currentPoints = Number(cur.rows[0]?.points || 0);
    const nextPoints = currentPoints + amount;

    const upd = await client.query(
      "UPDATE users SET points = $2 WHERE id = $1 RETURNING points",
      [userId, nextPoints]
    );

    await client.query(
      `
      INSERT INTO point_logs (user_id, delta, balance_after, action, ref_type, ref_id, note)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [userId, amount, nextPoints, "admin_charge", "user", userId, "現金チャージ"]
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

    await client.query("COMMIT");

    return NextResponse.json({ ok: true, points: upd.rows[0]?.points ?? nextPoints });
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    return NextResponse.json({ ok: false, error: "チャージに失敗しました。" }, { status: 500 });
  } finally {
    client.release();
  }
}
