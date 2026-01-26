import { NextResponse } from "next/server";
import { Pool } from "pg";

export const runtime = "nodejs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function POST(request) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const userId = body?.userId;
    const shopId = body?.shopId;
    const amount = Number(body?.amount);

    if (!userId || !shopId || !Number.isFinite(amount) || amount <= 0 || !Number.isInteger(amount)) {
      return NextResponse.json(
        { ok: false, error: "amount, userId, shopId が必要です。" },
        { status: 400 }
      );
    }

    await client.query("BEGIN");

    const userRes = await client.query(
      "SELECT points FROM users WHERE id = $1 FOR UPDATE",
      [userId]
    );
    if (userRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: false, error: "ユーザーが見つかりません。" }, { status: 404 });
    }

    const shopRes = await client.query(
      "SELECT points, name FROM shop WHERE id = $1 FOR UPDATE",
      [shopId]
    );
    if (shopRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: false, error: "店舗が見つかりません。" }, { status: 404 });
    }

    const currentUserPoints = Number(userRes.rows[0]?.points || 0);
    const currentShopPoints = Number(shopRes.rows[0]?.points || 0);
    if (currentUserPoints < amount) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { ok: false, error: "ポイントが不足しています。", userPoints: currentUserPoints },
        { status: 400 }
      );
    }

    const nextUserPoints = currentUserPoints - amount;
    const nextShopPoints = currentShopPoints + amount;

    const userUpd = await client.query(
      "UPDATE users SET points = $2 WHERE id = $1 RETURNING points",
      [userId, nextUserPoints]
    );
    const shopUpd = await client.query(
      "UPDATE shop SET points = $2 WHERE id = $1 RETURNING points",
      [shopId, nextShopPoints]
    );
    const balanceAfter = userUpd.rows[0]?.points ?? nextUserPoints;
    const shopName = shopRes.rows[0]?.name || "支払い";
    await client.query(
      `
      INSERT INTO point_logs (user_id, delta, balance_after, action, ref_type, ref_id, note)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [userId, -amount, balanceAfter, "payment", "shop", shopId, shopName]
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

    return NextResponse.json({
      ok: true,
      userPoints: userUpd.rows[0]?.points ?? nextUserPoints,
      shopPoints: shopUpd.rows[0]?.points ?? nextShopPoints,
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
