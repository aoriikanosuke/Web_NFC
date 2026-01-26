import { NextResponse } from "next/server";
import { Pool } from "pg";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";

export const runtime = "nodejs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
let cachedUserHasName = null;

async function getUserColumnInfo(client) {
  if (cachedUserHasName !== null) {
    return { hasName: cachedUserHasName };
  }
  const res = await client.query(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name IN ('name', 'username')
    `
  );
  const columns = new Set(res.rows.map((row) => row.column_name));
  cachedUserHasName = columns.has("name");
  return { hasName: cachedUserHasName };
}

export async function GET(request) {
  const session = getAdminSessionFromRequest(request);
  if (!session.ok) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  if (!q) {
    return NextResponse.json({ ok: true, users: [] });
  }

  const client = await pool.connect();
  try {
    const { hasName } = await getUserColumnInfo(client);
    const term = `%${q}%`;
    const selectCols = hasName ? "id, name, username, points" : "id, username, points";
    const where = hasName ? "WHERE (username ILIKE $1 OR name ILIKE $1)" : "WHERE username ILIKE $1";
    const sql = `SELECT ${selectCols} FROM users ${where} ORDER BY username ASC LIMIT 50`;
    const res = await client.query(sql, [term]);
    return NextResponse.json({ ok: true, users: res.rows });
  } catch (e) {
    return NextResponse.json({ ok: false, error: "ユーザー検索に失敗しました。" }, { status: 500 });
  } finally {
    client.release();
  }
}
