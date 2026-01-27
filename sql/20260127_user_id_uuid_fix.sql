BEGIN;

-- If users.id is UUID, user_stamps.user_id and stamp_events.user_id
-- must also be UUID. This will fail if existing rows are INT-based.
-- In that case, clear the tables first.

-- Uncomment if you see type cast errors:
-- DELETE FROM user_stamps;
-- DELETE FROM stamp_events;

ALTER TABLE user_stamps
  ALTER COLUMN user_id TYPE uuid USING user_id::text::uuid;

ALTER TABLE stamp_events
  ALTER COLUMN user_id TYPE uuid USING user_id::text::uuid;

COMMIT;
