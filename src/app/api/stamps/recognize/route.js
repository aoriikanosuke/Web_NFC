import { NextResponse } from "next/server";
import { Pool } from "pg";

export const runtime = "nodejs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const RECENT_DUPLICATE_IGNORE_WINDOW_MS = 2_500;

let stampsColumnsCache = null;
let stampsColumnsCacheAt = 0;
let userStampsColumnsCache = null;
let userStampsColumnsCacheAt = 0;
let usersColumnsCache = null;
let usersColumnsCacheAt = 0;
let pointLogsColumnsCache = null;
let pointLogsColumnsCacheAt = 0;
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
  if (tableName === "users" && usersColumnsCache && now - usersColumnsCacheAt < COLUMNS_CACHE_MS) {
    return usersColumnsCache;
  }
  if (
    tableName === "point_logs" &&
    pointLogsColumnsCache &&
    now - pointLogsColumnsCacheAt < COLUMNS_CACHE_MS
  ) {
    return pointLogsColumnsCache;
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
  } else if (tableName === "users") {
    usersColumnsCache = cols;
    usersColumnsCacheAt = now;
  } else if (tableName === "point_logs") {
    pointLogsColumnsCache = cols;
    pointLogsColumnsCacheAt = now;
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

function getStampValueColumn(columns) {
  if (columns.has("value")) return "value";
  if (columns.has("points")) return "points";
  return null;
}

function buildStampLookupQuery(columns, source, valueColumn) {
  const sortExpr = columns.has("sort_order") ? "COALESCE(sort_order, id)" : "id";
  const imageExpr = columns.has("image_url")
    ? "image_url"
    : columns.has("image")
      ? "image"
      : "NULL::text";
  const valueExpr = valueColumn || "NULL::int";
  const activeWhere = columns.has("is_active") ? "AND is_active = true" : "";

  if (source === "nfc") {
    return {
      sql: `
        SELECT id, name, ${imageExpr} AS image_url, ${sortExpr} AS sort_order, ${valueExpr} AS value
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
        SELECT id, name, ${imageExpr} AS image_url, ${sortExpr} AS sort_order, ${valueExpr} AS value
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
      SELECT id, name, ${imageExpr} AS image_url, ${sortExpr} AS sort_order, ${valueExpr} AS value
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
    const usersColumns = await getTableColumns(client, "users");
    const pointLogsColumns = await getTableColumns(client, "point_logs");
    const hasSourceColumn = userStampsColumns.has("source");
    const stampValueColumn = getStampValueColumn(stampsColumns);

    if (!stampValueColumn) {
      return NextResponse.json(
        { ok: false, error: "stamps.value (or stamps.points) column is required." },
        { status: 500 }
      );
    }
    if (!usersColumns.has("points")) {
      return NextResponse.json(
        { ok: false, error: "users.points column is required." },
        { status: 500 }
      );
    }

    const normalizedUid = normalizeUid(uidRaw);
    const lookup = buildStampLookupQuery(stampsColumns, source, stampValueColumn);

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

    const userRes = await client.query(
      `SELECT points FROM users WHERE id = $1 FOR UPDATE`,
      [userId]
    );
    if (userRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: false, error: "User not found." }, { status: 404 });
    }
    const pointsBefore = Number(userRes.rows[0]?.points || 0);
    let pointsAfter = pointsBefore;
    let delta = 0;

    const stampRes = await client.query(lookup.sql, lookup.mapParams(lookupParam));
    const stamp = stampRes.rows[0];

    if (!stamp) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: false, error: "Stamp not found." }, { status: 404 });
    }

    if (stamp.value == null) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { ok: false, error: "stamps.value must be NOT NULL." },
        { status: 500 }
      );
    }
    const stampValue = Number(stamp.value);
    if (!Number.isFinite(stampValue) || !Number.isInteger(stampValue)) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { ok: false, error: "stamps.value must be an integer." },
        { status: 500 }
      );
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
      delta = stampValue;

      const updRes = await client.query(
        `
        UPDATE users
        SET points = COALESCE(points, 0) + $2
        WHERE id = $1
        RETURNING points
        `,
        [userId, delta]
      );
      pointsAfter = Number(updRes.rows[0]?.points ?? pointsBefore + delta);

      if (pointLogsColumns.size > 0) {
        if (!pointLogsColumns.has("delta")) {
          await client.query("ROLLBACK");
          return NextResponse.json(
            { ok: false, error: "point_logs.delta column is required." },
            { status: 500 }
          );
        }

        const fields = ["user_id", "delta"];
        const values = [userId, delta];

        const balanceColumn = pointLogsColumns.has("balance_after")
          ? "balance_after"
          : pointLogsColumns.has("balance")
            ? "balance"
            : null;
        if (balanceColumn) {
          fields.push(balanceColumn);
          values.push(pointsAfter);
        }

        const actionColumn = pointLogsColumns.has("action")
          ? "action"
          : pointLogsColumns.has("kind")
            ? "kind"
            : null;
        if (actionColumn) {
          fields.push(actionColumn);
          values.push("STAMP_ACQUIRED");
        }

        if (pointLogsColumns.has("stamp_id")) {
          fields.push("stamp_id");
          values.push(stamp.id);
        } else {
          if (pointLogsColumns.has("ref_type")) {
            fields.push("ref_type");
            values.push("stamp");
          }
          if (pointLogsColumns.has("ref_id")) {
            fields.push("ref_id");
            values.push(stamp.id);
          }
        }

        if (pointLogsColumns.has("source")) {
          fields.push("source");
          values.push(source);
        }

        if (pointLogsColumns.has("note")) {
          fields.push("note");
          values.push(stamp.name || "stamp acquired");
        }

        const placeholders = fields.map((_, i) => `$${i + 1}`).join(", ");
        const pointLogSql = `
          INSERT INTO point_logs (${fields.join(", ")})
          VALUES (${placeholders})
        `;
        await client.query(pointLogSql, values);

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
      } else {
        console.warn("point_logs table not found; skipping point log insert.");
      }

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
      acquired,
      stamp: {
        id: stamp.id,
        name: stamp.name,
        image_url: stamp.image_url || "/images/default.png",
        value: stampValue,
        sort_order: Number(stamp.sort_order) || 0,
      },
      recentDuplicate,
      points: pointsAfter,
      delta,
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
