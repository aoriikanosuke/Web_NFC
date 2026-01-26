-- Admin auth table
CREATE TABLE IF NOT EXISTS admin_auth (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  password_hash TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Initial admin password (bcrypt hash for "admin1234")
INSERT INTO admin_auth (password_hash)
VALUES ('$2a$10$LSEWs5RcebgmtUMH22Rs3OyZ/aziIlXtUf88LhiUnIE3FErDcMJpK');
