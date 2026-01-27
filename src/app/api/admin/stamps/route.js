import { NextResponse } from "next/server";
import { Pool } from "pg";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";

export const runtime = "nodejs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

let stampsColumnsCache = null;
let stampsColumnsCacheAt = 0;
const STAMPS_COLUMNS_CACHE_MS = 60 * 1000;

async function getStampsColumns(client) {
  const now = Date.now();
  if (stampsColumnsCache && now - stampsColumnsCacheAt < STAMPS_COLUMNS_CACHE_MS) {
    return stampsColumnsCache;
  }
  const res = await client.query(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'stamps'
    `
  );
  const cols = new Set(res.rows.map((row) => String(row.column_name)));
  stampsColumnsCache = cols;
  stampsColumnsCacheAt = now;
  return cols;
}

function optionalColumnSelect(columns, name, type = "text") {
  return columns.has(name) ? name : `NULL::${type} AS ${name}`;
}

export async function GET(request) {
  const session = getAdminSessionFromRequest(request);
  if (!session.ok) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const client = await pool.connect();
  try {
    const columns = await getStampsColumns(client);
    const valueSelect = optionalColumnSelect(columns, "value", "int");
    const pointsSelect = optionalColumnSelect(columns, "points", "int");
    const imageUrlSelect = optionalColumnSelect(columns, "image_url", "text");
    const imageSelect = optionalColumnSelect(columns, "image", "text");
    const locationSelect = optionalColumnSelect(columns, "location", "text");
    const sortOrderSelect = optionalColumnSelect(columns, "sort_order", "int");
    const isActiveSelect = optionalColumnSelect(columns, "is_active", "bool");
    const createdAtSelect = optionalColumnSelect(columns, "created_at", "timestamptz");

    const res = await client.query(
      `
      SELECT
        id,
        name,
        uid,
        token,
        ${valueSelect},
        ${pointsSelect},
        ${locationSelect},
        ${imageUrlSelect},
        ${imageSelect},
        ${sortOrderSelect},
        ${isActiveSelect},
        ${createdAtSelect}
      FROM stamps
      ORDER BY id ASC
      `
    );

    return NextResponse.json({ ok: true, stamps: res.rows });
  } catch (error) {
    console.error("admin/stamps load error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to load stamps." },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

