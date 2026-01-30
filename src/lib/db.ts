import "server-only";
import { Pool } from "pg";

export type UserRow = {
  id: number;
  username?: string | null;
  line_sub?: string | null;
  line_name?: string | null;
  line_picture?: string | null;
  points?: number | null;
};

const globalForPg = globalThis as typeof globalThis & { _pgPool?: Pool };

const pool =
  globalForPg._pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg._pgPool = pool;
}

export function getPool() {
  return pool;
}

export async function findUserByLineSub(lineSub: string): Promise<UserRow | null> {
  const result = await pool.query(
    `SELECT id, username, line_sub, line_name, line_picture, points
     FROM users
     WHERE line_sub = $1
     LIMIT 1`,
    [lineSub]
  );
  return result.rows[0] ?? null;
}

export async function findUserById(id: number): Promise<UserRow | null> {
  const result = await pool.query(
    `SELECT id, username, line_sub, line_name, line_picture, points
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function createUserFromLine(params: {
  lineSub: string;
  lineName?: string | null;
  linePicture?: string | null;
  username?: string | null;
  passwordHash?: string | null;
}): Promise<UserRow | null> {
  const { lineSub, lineName, linePicture, username, passwordHash } = params;
  const result = await pool.query(
    `
    INSERT INTO users (line_sub, line_name, line_picture, username, password_hash)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (line_sub) DO UPDATE
      SET line_name = COALESCE(EXCLUDED.line_name, users.line_name),
          line_picture = COALESCE(EXCLUDED.line_picture, users.line_picture)
    RETURNING id, username, line_sub, line_name, line_picture, points
    `,
    [lineSub, lineName ?? null, linePicture ?? null, username ?? null, passwordHash ?? null]
  );
  return result.rows[0] ?? null;
}
