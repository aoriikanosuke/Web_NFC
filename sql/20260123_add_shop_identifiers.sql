-- Add identifiers for NFC shop resolution
ALTER TABLE shop ADD COLUMN IF NOT EXISTS uid TEXT;
ALTER TABLE shop ADD COLUMN IF NOT EXISTS token TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS shop_uid_unique ON shop (uid);
CREATE UNIQUE INDEX IF NOT EXISTS shop_token_unique ON shop (token);

-- Seed two shops (replace UID/TOKEN with real tag values)
INSERT INTO shop (id, name, points, location, uid, token)
VALUES
  (1, '店舗A', 0, '店舗A：入口付近', '04:18:B8:AA:96:20:90', 'k9QmT2vN7xR_p4LdZsW-1aHc'),
  (2, '店舗B', 0, '店舗B：入口付近', '04:18:B7:AA:96:20:90', 'P3uXvG8n0Jt_y6KeRmQ-9fNd')
ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name,
      location = EXCLUDED.location,
      uid = EXCLUDED.uid,
      token = EXCLUDED.token;

