import { NextResponse } from "next/server";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import {
  ADMIN_COOKIE_NAME,
  createAdminSessionToken,
  getAdminSessionCookieOptions,
} from "@/lib/adminAuth";

export const runtime = "nodejs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function POST(request) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const password = body?.password ? String(body.password) : "";

    if (!password) {
      return NextResponse.json({ ok: false, error: "password が必要です。" }, { status: 400 });
    }

    const authRes = await client.query(
      `
      SELECT id, password_hash
      FROM admin_auth
      WHERE is_active = TRUE
      ORDER BY updated_at DESC, id DESC
      LIMIT 1
      `
    );

    if (authRes.rowCount === 0) {
      return NextResponse.json({ ok: false, error: "管理者認証が未設定です。" }, { status: 500 });
    }

    const row = authRes.rows[0];
    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) {
      return NextResponse.json({ ok: false, error: "パスワードが間違っています。" }, { status: 401 });
    }

    const token = createAdminSessionToken();
    if (!token) {
      return NextResponse.json({ ok: false, error: "セッション設定が不足しています。" }, { status: 500 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_COOKIE_NAME, token, getAdminSessionCookieOptions());
    return response;
  } catch (e) {
    return NextResponse.json({ ok: false, error: "ログインに失敗しました。" }, { status: 500 });
  } finally {
    client.release();
  }
}
