import { NextResponse } from "next/server";
import { Pool } from "pg";

export const runtime = "nodejs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const RECENT_DUPLICATE_IGNORE_WINDOW_MS = 2_500;

let stampsColumnsCache = null;
let stampsColumnsCacheAt = 0;
let userStampsColumnsCache = null;
let userStampsColumnsCacheAt = 0;
const COLUMNS_CACHE_MS = 60 * 1000;

async function getTableColumns(client, tableName) {
  const now = Date.now();
  if (tableName === "stamps" && stampsColumnsCache && now - stampsColumnsCacheAt < COLUMNS_CACHE_MS) {
    return stampsColumnsCache;
  }
  if (
    tableName === "user_stamps" &&
    userStampsColumnsCache &&
    now - userStampsColumnsCacheAt < COLUMNS_CACHE_MS
  ) {
    return userStampsColumnsCache;
  }

  const res = await client.query(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = $1
    `,
    [tableName]
  );
  const cols = new Set(res.rows.map((row) => String(row.column_name)));

  if (tableName === "stamps") {
    stampsColumnsCache = cols;
    stampsColumnsCacheAt = now;
  } else if (tableName === "user_stamps") {
    userStampsColumnsCache = cols;
    userStampsColumnsCacheAt = now;
  }

  return cols;
}

function normalizeUserId(value) {
  if (value == null) return null;
  const str = String(value).trim();
  return str ? str : null;
}

function normalizeUid(value) {
  return String(value || "").replace(/[^0-9a-f]/gi, "").toUpperCase();
}

function buildStampLookupQuery(columns, source) {
  const sortExpr = columns.has("sort_order") ? "COALESCE(sort_order, id)" : "id";
  const imageExpr = columns.has("image_url")
    ? "image_url"
    : columns.has("image")
      ? "image"
      : "NULL::text";
  const activeWhere = columns.has("is_active") ? "AND is_active = true" : "";

  if (source === "nfc") {
    return {
      sql: `
        SELECT id, name, ${imageExpr} AS image_url, ${sortExpr} AS sort_order
        FROM stamps
        WHERE uid IS NOT NULL
          AND (
            UPPER(uid) = UPPER($1)
            OR UPPER(REGEXP_REPLACE(uid, '[^0-9A-Fa-f]', '', 'g')) = $2
          )
          ${activeWhere}
        LIMIT 1
      `,
      mapParams: (payload) => [payload.uidRaw, payload.normalizedUid],
    };
  }

  if (source === "token") {
    return {
      sql: `
        SELECT id, name, ${imageExpr} AS image_url, ${sortExpr} AS sort_order
        FROM stamps
        WHERE token IS NOT NULL
          AND token = $1
          ${activeWhere}
        LIMIT 1
      `,
      mapParams: (token) => [token],
    };
  }

  return {
    sql: `
      SELECT id, name, ${imageExpr} AS image_url, ${sortExpr} AS sort_order
      FROM stamps
      WHERE id = $1
        ${activeWhere}
      LIMIT 1
    `,
    mapParams: (stampId) => [stampId],
  };
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const userId = normalizeUserId(body?.userId);
  const source = body?.source;
  const uidRaw = body?.uid != null ? String(body.uid) : "";
  const token = body?.token != null ? String(body.token) : "";
  const debugStampId = body?.debugStampId != null ? Number(body.debugStampId) : null;

  if (!userId || !source) {
    return NextResponse.json({ ok: false, error: "userId and source are required." }, { status: 400 });
  }

  if (!["nfc", "token", "debug"].includes(source)) {
    return NextResponse.json({ ok: false, error: "Invalid source." }, { status: 400 });
  }

  if (source === "nfc" && !uidRaw) {
    return NextResponse.json({ ok: false, error: "uid is required for nfc source." }, { status: 400 });
  }
  if (source === "token" && !token) {
    return NextResponse.json({ ok: false, error: "token is required for token source." }, { status: 400 });
  }
  if (source === "debug" && !Number.isFinite(debugStampId)) {
    return NextResponse.json(
      { ok: false, error: "debugStampId is required for debug source." },
      { status: 400 }
    );
  }

  const client = await pool.connect();
  try {
    const stampsColumns = await getTableColumns(client, "stamps");
    const userStampsColumns = await getTableColumns(client, "user_stamps");
    const hasSourceColumn = userStampsColumns.has("source");

    const normalizedUid = normalizeUid(uidRaw);
    const lookup = buildStampLookupQuery(stampsColumns, source);

    let lookupParam = null;
    if (source === "nfc") {
      lookupParam = {
        uidRaw,
        normalizedUid: normalizedUid || uidRaw,
      };
    }
    if (source === "token") lookupParam = token;
    if (source === "debug") lookupParam = Math.trunc(Number(debugStampId));

    await client.query("BEGIN");

    const stampRes = await client.query(lookup.sql, lookup.mapParams(lookupParam));
    const stamp = stampRes.rows[0];

    if (!stamp) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: false, error: "Stamp not found." }, { status: 404 });
    }

    const insertSql = hasSourceColumn
      ? `
        INSERT INTO user_stamps (user_id, stamp_id, source)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, stamp_id) DO NOTHING
        RETURNING acquired_at
      `
      : `
        INSERT INTO user_stamps (user_id, stamp_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, stamp_id) DO NOTHING
        RETURNING acquired_at
      `;

    const insertParams = hasSourceColumn ? [userId, stamp.id, source] : [userId, stamp.id];
    const insertRes = await client.query(insertSql, insertParams);
    const inserted = insertRes.rowCount === 1;

    let recentDuplicate = false;
    if (!inserted) {
      try {
        const recentRes = await client.query(
          `
          SELECT created_at
          FROM stamp_events
          WHERE user_id = $1
            AND stamp_id = $2
            AND type = $3
          ORDER BY created_at DESC
          LIMIT 1
          `,
          [userId, stamp.id, "STAMP_ACQUIRED"]
        );
        const recentAt = recentRes.rows[0]?.created_at
          ? new Date(recentRes.rows[0].created_at).getTime()
          : 0;
        const age = Date.now() - recentAt;
        if (Number.isFinite(age) && age >= 0 && age <= RECENT_DUPLICATE_IGNORE_WINDOW_MS) {
          recentDuplicate = true;
        }
      } catch (recentError) {
        console.error("recent stamp_events check error:", recentError);
      }
    }

    const acquired = inserted;

    if (inserted) {
      await client.query(
        `
        INSERT INTO stamp_events (user_id, stamp_id, type, source)
        VALUES ($1, $2, $3, $4)
        `,
        [userId, stamp.id, "STAMP_ACQUIRED", source]
      );
    }

    await client.query("COMMIT");

    return NextResponse.json({
      ok: true,
      stamp: {
        id: stamp.id,
        name: stamp.name,
        image_url: stamp.image_url || "/images/default.png",
        sort_order: Number(stamp.sort_order) || 0,
      },
      acquired,
      recentDuplicate,
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    console.error("POST /api/stamps/recognize error:", error);
    const detail = String(error?.message || error || "Failed to recognize stamp.");
    return NextResponse.json({ ok: false, error: detail }, { status: 500 });
  } finally {
    client.release();
  }
}
