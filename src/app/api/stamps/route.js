import { NextResponse } from "next/server";
import { Pool } from "pg";

export const runtime = "nodejs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

let columnsCache = null;
let columnsCacheAt = 0;
const COLUMNS_CACHE_MS = 60 * 1000;

async function getStampsColumns(client) {
  const now = Date.now();
  if (columnsCache && now - columnsCacheAt < COLUMNS_CACHE_MS) {
    return columnsCache;
  }
  const res = await client.query(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'stamps'
    `
  );
  const cols = new Set(res.rows.map((row) => String(row.column_name)));
  columnsCache = cols;
  columnsCacheAt = now;
  return cols;
}

function normalizeUserId(value) {
  if (value == null) return null;
  const str = String(value).trim();
  return str ? str : null;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = normalizeUserId(searchParams.get("userId"));

  const client = await pool.connect();
  try {
    const columns = await getStampsColumns(client);

    const sortExpr = columns.has("sort_order")
      ? "COALESCE(s.sort_order, s.id)"
      : "s.id";
    const imageExpr = columns.has("image_url")
      ? "s.image_url"
      : columns.has("image")
        ? "s.image"
        : "NULL::text";
    const locationExpr = columns.has("location") ? "s.location" : "NULL::text";
    const pointsExpr = columns.has("points")
      ? "s.points"
      : columns.has("value")
        ? "s.value"
        : "NULL::int";
    const activeWhere = columns.has("is_active") ? "WHERE s.is_active = true" : "";

    let points = null;
    if (userId) {
      const userRes = await client.query(
        `SELECT id, COALESCE(points, 0) AS points FROM users WHERE id = $1 LIMIT 1`,
        [userId]
      );
      if (!userRes.rows.length) {
        return NextResponse.json({ ok: false, error: "User not found." }, { status: 404 });
      }
      points = Number(userRes.rows[0].points || 0);
    }

    const params = [];
    let joinSql = "";
    let acquiredSelect = "FALSE AS acquired, NULL::timestamptz AS acquired_at";

    if (userId) {
      params.push(userId);
      joinSql = "LEFT JOIN user_stamps us ON us.stamp_id = s.id AND us.user_id = $1";
      acquiredSelect = "(us.user_id IS NOT NULL) AS acquired, us.acquired_at";
    }

    const stampsRes = await client.query(
      `
      SELECT
        s.id,
        s.name,
        ${imageExpr} AS image_url,
        ${sortExpr} AS sort_order,
        ${locationExpr} AS location,
        ${pointsExpr} AS points,
        ${acquiredSelect}
      FROM stamps s
      ${joinSql}
      ${activeWhere}
      ORDER BY ${sortExpr} ASC, s.id ASC
      `,
      params
    );

    return NextResponse.json({
      ok: true,
      stamps: stampsRes.rows.map((row) => ({
        id: row.id,
        name: row.name,
        image_url: row.image_url || "/images/default.png",
        sort_order: Number(row.sort_order) || 0,
        location: row.location || "",
        points: row.points != null ? Number(row.points) : 0,
        acquired: !!row.acquired,
        acquired_at: row.acquired_at || null,
      })),
      totalStamps: stampsRes.rows.length,
      points,
    });
  } catch (error) {
    console.error("GET /api/stamps error:", error);
    const detail = String(error?.message || error || "Failed to load stamps.");
    return NextResponse.json({ ok: false, error: detail }, { status: 500 });
  } finally {
    client.release();
  }
}
