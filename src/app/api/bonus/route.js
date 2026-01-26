import { NextResponse } from "next/server";
import { Pool } from "pg";

export const runtime = "nodejs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const BONUS_AMOUNT = 100;

/**
 * GET /api/bonus?userId=...
 * - 現在のポイントと bonus_claimed を返す（フロント同期用）
 */
export async function GET(request) {
  const client = await pool.connect();
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ ok: false, error: "userId が必要です。" }, { status: 400 });
    }

    const cur = await client.query(
      "SELECT points, bonus_claimed, bonus_claimed_at FROM users WHERE id = $1",
      [userId]
    );

    if (cur.rowCount === 0) {
      return NextResponse.json({ ok: false, error: "ユーザーが見つかりません。" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      points: cur.rows[0]?.points ?? 0,
      bonusClaimed: !!cur.rows[0]?.bonus_claimed,
      bonusClaimedAt: cur.rows[0]?.bonus_claimed_at ?? null,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "取得に失敗しました。" }, { status: 500 });
  } finally {
    client.release();
  }
}

/**
 * POST /api/bonus
 * body: { userId }
 * - 初回のみ points に +BONUS_AMOUNT して bonus_claimed=true を立てる
 * - 2回目以降は加算せず、現在の points と alreadyClaimed=true を返す
 */
export async function POST(request) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const userId = body?.userId;

    if (!userId) {
      return NextResponse.json({ ok: false, error: "userId が必要です。" }, { status: 400 });
    }

    await client.query("BEGIN");

    // ✅ 初回のみ加算 + フラグON（原子的）
    const upd = await client.query(
      `
      UPDATE users
      SET
        points = COALESCE(points, 0) + $2,
        bonus_claimed = TRUE,
        bonus_claimed_at = NOW()
      WHERE id = $1 AND bonus_claimed = FALSE
      RETURNING points, bonus_claimed
      `,
      [userId, BONUS_AMOUNT]
    );

    // 0件なら「すでに受け取り済み」or「ユーザー不存在」
    if (upd.rowCount === 0) {
      const cur = await client.query(
        "SELECT points, bonus_claimed, bonus_claimed_at FROM users WHERE id = $1",
        [userId]
      );

      if (cur.rowCount === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json({ ok: false, error: "ユーザーが見つかりません。" }, { status: 404 });
      }

      await client.query("COMMIT");
      return NextResponse.json({
        ok: true,
        points: cur.rows[0]?.points ?? 0,
        bonus: 0,
        alreadyClaimed: true,
        bonusClaimed: !!cur.rows[0]?.bonus_claimed,
        bonusClaimedAt: cur.rows[0]?.bonus_claimed_at ?? null,
      });
    }

    await client.query(
      `
      INSERT INTO point_logs (user_id, delta, balance_after, action, ref_type, ref_id, note)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        userId,
        BONUS_AMOUNT,
        upd.rows[0]?.points ?? 0,
        "bonus",
        "bonus",
        null,
        "コンプリートボーナス",
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

    await client.query("COMMIT");
    return NextResponse.json({
      ok: true,
      points: upd.rows[0]?.points ?? 0,
      bonus: BONUS_AMOUNT,
      alreadyClaimed: false,
      bonusClaimed: true,
    });
  } catch {
    try {
      await client.query("ROLLBACK");
    } catch {}
    return NextResponse.json({ ok: false, error: "ボーナス付与に失敗しました。" }, { status: 500 });
  } finally {
    client.release();
  }
}
