import { NextResponse } from "next/server";
import { Pool } from "pg";

export const runtime = "nodejs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function POST(request) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const userId = body?.userId;
    const amount = Number(body?.amount);

    if (!userId || !Number.isFinite(amount) || amount <= 0 || !Number.isInteger(amount)) {
      return NextResponse.json({ ok: false, error: "amount と userId が必要です。" }, { status: 400 });
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

    const currentPoints = Number(currentRes.rows[0]?.points || 0);
    if (currentPoints < amount) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { ok: false, error: "ポイントが不足しています。", points: currentPoints },
        { status: 400 }
      );
    }

    const nextPoints = currentPoints - amount;
    const upd = await client.query(
      "UPDATE users SET points = $2 WHERE id = $1 RETURNING points",
      [userId, nextPoints]
    );

    await client.query("COMMIT");

    return NextResponse.json({
      ok: true,
      points: upd.rows[0]?.points ?? nextPoints,
    });
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    return NextResponse.json({ ok: false, error: "決済に失敗しました。" }, { status: 500 });
  } finally {
    client.release();
  }
}
