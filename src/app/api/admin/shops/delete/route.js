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

    if (!shopId) {
      return NextResponse.json({ ok: false, error: "shopId is required." }, { status: 400 });
    }

    const res = await client.query(
      `
      DELETE FROM shop
      WHERE id = $1
      RETURNING id, name
      `,
      [shopId]
    );

    if (res.rowCount === 0) {
      return NextResponse.json({ ok: false, error: "Shop not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, shop: res.rows[0] });
  } catch (e) {
    console.error("admin/shops/delete error:", e);
    return NextResponse.json({ ok: false, error: "Failed to delete shop." }, { status: 500 });
  } finally {
    client.release();
  }
}

