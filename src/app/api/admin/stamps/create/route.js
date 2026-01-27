import crypto from "crypto";
import { NextResponse } from "next/server";
import { Pool } from "pg";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";

export const runtime = "nodejs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function generateToken() {
  return crypto.randomBytes(18).toString("base64url");
}

function buildStampUrl(request, token) {
  const origin = request.nextUrl?.origin || "";
  return `${origin}/?t=${encodeURIComponent(token)}`;
}

function parsePoints(body) {
  const raw = body?.points ?? body?.value;
  const num = Number(raw);
  if (!Number.isFinite(num)) {
    return { ok: false, error: "points (or value) must be a number." };
  }
  if (!Number.isInteger(num) || num < 0) {
    return { ok: false, error: "points (or value) must be a non-negative integer." };
  }
  return { ok: true, value: num };
}

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

export async function POST(request) {
  const session = getAdminSessionFromRequest(request);
  if (!session.ok) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const client = await pool.connect();
  try {
    const columns = await getStampsColumns(client);
    const body = await request.json().catch(() => ({}));
    const name = body?.name ? String(body.name).trim() : "";
    const uid = body?.uid ? String(body.uid).trim() : "";
    const providedToken = body?.token ? String(body.token).trim() : "";
    const location = body?.location ? String(body.location).trim() : "";
    const imageUrl = body?.image_url ? String(body.image_url).trim() : "";

    if (!name || !uid) {
      return NextResponse.json(
        { ok: false, error: "name and uid are required." },
        { status: 400 }
      );
    }

    if (!imageUrl) {
      return NextResponse.json(
        { ok: false, error: "image_url is required." },
        { status: 400 }
      );
    }

    const pointsColumn = columns.has("value")
      ? "value"
      : columns.has("points")
        ? "points"
        : null;
    if (!pointsColumn) {
      return NextResponse.json(
        { ok: false, error: "stamps table is missing value/points column." },
        { status: 500 }
      );
    }

    const imageColumn = columns.has("image_url")
      ? "image_url"
      : columns.has("image")
        ? "image"
        : null;
    if (!imageColumn) {
      return NextResponse.json(
        { ok: false, error: "stamps table is missing image_url/image column." },
        { status: 500 }
      );
    }

    const canSetLocation = columns.has("location");

    const pointsResult = parsePoints(body);
    if (!pointsResult.ok) {
      return NextResponse.json({ ok: false, error: pointsResult.error }, { status: 400 });
    }

    let token = providedToken || generateToken();
    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Failed to generate token." },
        { status: 500 }
      );
    }

    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        const fields = ["name", "uid", "token", pointsColumn];
        const values = [name, uid, token, pointsResult.value];

        if (canSetLocation) {
          fields.push("location");
          values.push(location || null);
        }

        fields.push(imageColumn);
        values.push(imageUrl);

        const placeholders = fields.map((_, i) => `$${i + 1}`).join(", ");
        const insertSql = `
          INSERT INTO stamps (${fields.join(", ")})
          VALUES (${placeholders})
          RETURNING id, name, uid, token, ${
            columns.has("value") ? "value" : "NULL::int AS value"
          }, ${
            columns.has("points") ? "points" : "NULL::int AS points"
          }, ${
            canSetLocation ? "location" : "NULL::text AS location"
          }, ${
            columns.has("image_url") ? "image_url" : "NULL::text AS image_url"
          }, ${
            columns.has("image") ? "image" : "NULL::text AS image"
          }, created_at
        `;

        const res = await client.query(
          insertSql,
          values
        );

        const stamp = res.rows[0];
        return NextResponse.json({
          ok: true,
          stamp: {
            ...stamp,
            points: stamp?.value ?? pointsResult.value,
          },
          url: buildStampUrl(request, stamp.token),
        });
      } catch (error) {
        if (error?.code === "23505") {
          const detail = String(error?.detail || "");
          if (detail.includes("(uid)")) {
            return NextResponse.json(
              { ok: false, error: "This UID is already registered." },
              { status: 409 }
            );
          }
          if (!providedToken) {
            token = generateToken();
            continue;
          }
          return NextResponse.json(
            { ok: false, error: "This token is already in use." },
            { status: 409 }
          );
        }
        throw error;
      }
    }

    return NextResponse.json(
      { ok: false, error: "Token collision. Please try again." },
      { status: 409 }
    );
  } catch (error) {
    console.error("admin/stamps/create error:", error);
    const detail = String(error?.message || error || "Failed to create stamp.");
    return NextResponse.json(
      { ok: false, error: detail },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
