-- Stamps schema hardening + image_url for Vercel Blob
-- Safe to run multiple times.

CREATE TABLE IF NOT EXISTS stamps (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  uid TEXT NOT NULL,
  token TEXT NOT NULL,
  value INTEGER NOT NULL DEFAULT 0,
  location TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE stamps
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Prefer indexes over constraints here to keep this idempotent.
CREATE UNIQUE INDEX IF NOT EXISTS stamps_token_unique ON stamps (token);
CREATE UNIQUE INDEX IF NOT EXISTS stamps_uid_unique ON stamps (uid);

