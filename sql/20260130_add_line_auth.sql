ALTER TABLE users
  ADD COLUMN IF NOT EXISTS line_sub TEXT,
  ADD COLUMN IF NOT EXISTS line_name TEXT,
  ADD COLUMN IF NOT EXISTS line_picture TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS users_line_sub_unique
  ON users (line_sub)
  WHERE line_sub IS NOT NULL AND btrim(line_sub) <> '';
