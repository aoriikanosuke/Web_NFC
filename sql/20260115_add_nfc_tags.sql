-- NFC token -> stamp mapping
CREATE TABLE IF NOT EXISTS nfc_tags (
  token TEXT PRIMARY KEY,
  stamp_id INT NOT NULL REFERENCES stamps(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Prevent duplicate stamp acquisition
CREATE UNIQUE INDEX IF NOT EXISTS user_stamps_unique
  ON user_stamps (user_id, stamp_id);
