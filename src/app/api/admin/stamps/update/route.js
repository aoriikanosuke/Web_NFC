import { NextResponse } from "next/server";
import { Pool } from "pg";
import { del } from "@vercel/blob";
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

function parseOptionalPoints(body) {
  const raw = body?.points ?? body?.value;
  if (raw === undefined) {
    return { ok: true, has: false, value: 0 };
  }
  const num = Number(raw);
  if (!Number.isFinite(num)) {
    return { ok: false, error: "points (or value) must be a number." };
  }
  if (!Number.isInteger(num) || num < 0) {
    return { ok: false, error: "points (or value) must be a non-negative integer." };
  }
  return { ok: true, has: true, value: num };
}

function isVercelBlobUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return url.hostname.includes("blob.vercel-storage.com");
  } catch {
    return false;
  }
}

export async function POST(request) {
  const session = getAdminSessionFromRequest(request);
  if (!session.ok) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const client = await pool.connect();
  try {
    const body = await request.json().catch(() => ({}));
    const stampId = body?.stampId ?? body?.id;
    if (stampId === undefined || stampId === null || stampId === "") {
      return NextResponse.json(
        { ok: false, error: "stampId is required." },
        { status: 400 }
      );
    }

    await client.query("BEGIN");

    const columns = await getStampsColumns(client);

    const pointColumns = [];
    if (columns.has("value")) {
      pointColumns.push("value");
    }
    if (columns.has("points")) {
      pointColumns.push("points");
    }

    const imageColumn = columns.has("image_url")
      ? "image_url"
      : columns.has("image")
        ? "image"
        : null;

    const canSetLocation = columns.has("location");
    const canSetSortOrder = columns.has("sort_order");
    const canSetIsActive = columns.has("is_active");

    let previousImageUrl = null;
    let nextImageUrl = null;
    let shouldDeletePreviousImage = false;

    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    const addSet = (column, value) => {
      setClauses.push(`${column} = $${paramIndex}`);
      values.push(value);
      paramIndex += 1;
    };

    if (body?.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) {
        await client.query("ROLLBACK");
        return NextResponse.json({ ok: false, error: "name cannot be empty." }, { status: 400 });
      }
      addSet("name", name);
    }

    if (body?.uid !== undefined) {
      const uid = String(body.uid).trim();
      if (!uid) {
        await client.query("ROLLBACK");
        return NextResponse.json({ ok: false, error: "uid cannot be empty." }, { status: 400 });
      }
      addSet("uid", uid);
    }

    if (body?.token !== undefined) {
      const token = String(body.token || "").trim();
      addSet("token", token || null);
    }

    const pointsResult = parseOptionalPoints(body);
    if (!pointsResult.ok) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: false, error: pointsResult.error }, { status: 400 });
    }
    if (pointsResult.has) {
      if (pointColumns.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { ok: false, error: "stamps table is missing value/points column." },
          { status: 500 }
        );
      }
      pointColumns.forEach((column) => addSet(column, pointsResult.value));
    }

    if (body?.image_url !== undefined) {
      if (!imageColumn) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { ok: false, error: "stamps table is missing image_url/image column." },
          { status: 500 }
        );
      }
      const prevRes = await client.query(
        `SELECT ${imageColumn} FROM stamps WHERE id = $1 FOR UPDATE`,
        [stampId]
      );
      if (prevRes.rowCount === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json({ ok: false, error: "Stamp not found." }, { status: 404 });
      }
      previousImageUrl = prevRes.rows[0]?.[imageColumn] || null;
      const imageUrl = String(body.image_url || "").trim();
      if (!imageUrl) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { ok: false, error: "image_url cannot be empty." },
          { status: 400 }
        );
      }
      nextImageUrl = imageUrl;
      shouldDeletePreviousImage = Boolean(previousImageUrl && previousImageUrl !== nextImageUrl);
      addSet(imageColumn, nextImageUrl);
    }

    if (canSetLocation && body?.location !== undefined) {
      const location = String(body.location || "").trim();
      addSet("location", location || null);
    }

    if (canSetSortOrder && body?.sort_order !== undefined) {
      if (body.sort_order === null || body.sort_order === "") {
        addSet("sort_order", null);
      } else {
        const sortOrderNum = Number(body.sort_order);
        if (!Number.isFinite(sortOrderNum) || !Number.isInteger(sortOrderNum)) {
          await client.query("ROLLBACK");
          return NextResponse.json(
            { ok: false, error: "sort_order must be an integer." },
            { status: 400 }
          );
        }
        addSet("sort_order", sortOrderNum);
      }
    }

    if (canSetIsActive && body?.is_active !== undefined) {
      let isActive;
      if (typeof body.is_active === "boolean") {
        isActive = body.is_active;
      } else if (body.is_active === "true") {
        isActive = true;
      } else if (body.is_active === "false") {
        isActive = false;
      } else {
        isActive = Boolean(body.is_active);
      }
      addSet("is_active", isActive);
    }

    if (setClauses.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { ok: false, error: "No updatable fields were provided." },
        { status: 400 }
      );
    }

    const valueSelect = optionalColumnSelect(columns, "value", "int");
    const pointsSelect = optionalColumnSelect(columns, "points", "int");
    const imageUrlSelect = optionalColumnSelect(columns, "image_url", "text");
    const imageSelect = optionalColumnSelect(columns, "image", "text");
    const locationSelect = optionalColumnSelect(columns, "location", "text");
    const sortOrderSelect = optionalColumnSelect(columns, "sort_order", "int");
    const isActiveSelect = optionalColumnSelect(columns, "is_active", "bool");
    const createdAtSelect = optionalColumnSelect(columns, "created_at", "timestamptz");

    values.push(stampId);
    const whereParam = `$${paramIndex}`;

    const updateSql = `
      UPDATE stamps
      SET ${setClauses.join(", ")}
      WHERE id = ${whereParam}
      RETURNING
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
    `;

    const res = await client.query(updateSql, values);
    if (res.rowCount === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: false, error: "Stamp not found." }, { status: 404 });
    }

    await client.query("COMMIT");

    if (shouldDeletePreviousImage && isVercelBlobUrl(previousImageUrl)) {
      const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
      if (!blobToken) {
        console.warn("BLOB_READ_WRITE_TOKEN is missing; old stamp image was not deleted.");
      } else {
        try {
          await del(previousImageUrl, { token: blobToken });
        } catch (blobError) {
          console.error("Failed to delete previous stamp image:", blobError);
        }
      }
    }

    return NextResponse.json({ ok: true, stamp: res.rows[0] });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // ignore rollback errors
    }
    if (error?.code === "23505") {
      const detail = String(error?.detail || "");
      if (detail.includes("(uid)")) {
        return NextResponse.json(
          { ok: false, error: "This UID is already registered." },
          { status: 409 }
        );
      }
      if (detail.includes("(token)")) {
        return NextResponse.json(
          { ok: false, error: "This token is already in use." },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { ok: false, error: "Unique constraint violation." },
        { status: 409 }
      );
    }
    console.error("admin/stamps/update error:", error);
    const detail = String(error?.message || error || "Failed to update stamp.");
    return NextResponse.json({ ok: false, error: detail }, { status: 500 });
  } finally {
    client.release();
  }
}
