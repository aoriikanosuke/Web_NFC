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
    const confirmText = body?.confirmText ? String(body.confirmText) : "";

    if (confirmText !== "RESET") {
      return NextResponse.json({ ok: false, error: "confirmText が不正です。" }, { status: 400 });
    }

    await client.query("BEGIN");
    await client.query("UPDATE shop SET points = 0");
    await client.query("DELETE FROM user_stamps");
    await client.query("DELETE FROM point_logs");
    await client.query("DELETE FROM users");
    await client.query("COMMIT");

    return NextResponse.json({ ok: true });
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    return NextResponse.json({ ok: false, error: "全データリセットに失敗しました。" }, { status: 500 });
  } finally {
    client.release();
  }
}
