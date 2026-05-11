-- Give activities.id an auto-incrementing default (it's bigint, not uuid).
CREATE SEQUENCE IF NOT EXISTS activities_id_seq;
ALTER TABLE activities
  ALTER COLUMN id SET DEFAULT nextval('activities_id_seq');

-- Let upsert work on (user_id, strava_id) — skip if constraint already exists.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'activities_user_id_strava_id_key'
  ) THEN
    ALTER TABLE activities
      ADD CONSTRAINT activities_user_id_strava_id_key UNIQUE (user_id, strava_id);
  END IF;
END $$;

-- Let upsert on strava_connections work on user_id — skip if exists.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'strava_connections_user_id_key'
  ) THEN
    ALTER TABLE strava_connections
      ADD CONSTRAINT strava_connections_user_id_key UNIQUE (user_id);
  END IF;
END $$;
