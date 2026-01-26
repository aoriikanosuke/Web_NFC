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
    const shopId = body?.shopId ?? null;
    const resetAll = body?.all === true;

    if (!resetAll && !shopId) {
      return NextResponse.json({ ok: false, error: "shopId または all が必要です。" }, { status: 400 });
    }

    const res = resetAll
      ? await client.query("UPDATE shop SET points = 0")
      : await client.query("UPDATE shop SET points = 0 WHERE id = $1", [shopId]);

    return NextResponse.json({ ok: true, updated: res.rowCount || 0 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: "店舗ポイントのリセットに失敗しました。" }, { status: 500 });
  } finally {
    client.release();
  }
}
