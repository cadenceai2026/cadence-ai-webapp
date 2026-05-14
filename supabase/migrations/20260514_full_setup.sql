-- ═══════════════════════════════════════════════
-- FULL DATABASE SETUP (GAMIFICATION + PROFILES)
-- Run this entire script in your Supabase SQL Editor
-- ═══════════════════════════════════════════════

-- ── 1. MISSING PROFILE COLUMNS ───────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS runner_type text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS goal text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS coach_lang text DEFAULT 'en';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS coach_style text DEFAULT 'friendly';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notif_weekly boolean DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notif_ranking boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notif_inactive boolean DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notif_winner boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS auto_sync boolean DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan text DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

-- ── 2. CREATE GAMIFICATION TABLES ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS game_profiles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  level           int  NOT NULL DEFAULT 1,
  total_xp        int  NOT NULL DEFAULT 0,
  season_xp       int  NOT NULL DEFAULT 0,
  league          text NOT NULL DEFAULT 'bronze' CHECK (league IN ('bronze','silver','gold','elite')),
  streak_days     int  NOT NULL DEFAULT 0,
  last_run_date   date,
  weekly_km       numeric(8,2) NOT NULL DEFAULT 0,
  total_km        numeric(10,2) NOT NULL DEFAULT 0,
  battles_won     int  NOT NULL DEFAULT 0,
  battles_lost    int  NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS battles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opponent_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenger_km   numeric(8,2) NOT NULL DEFAULT 0,
  opponent_km     numeric(8,2) NOT NULL DEFAULT 0,
  winner_id       uuid REFERENCES auth.users(id),
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  battle_type     text NOT NULL DEFAULT 'weekly_km',
  title           text,
  week_number     int,
  end_date        timestamptz NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS battle_pass_seasons (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_number   int NOT NULL UNIQUE,
  name            text NOT NULL,
  start_date      timestamptz NOT NULL,
  end_date        timestamptz NOT NULL,
  total_levels    int NOT NULL DEFAULT 50,
  is_active       boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS battle_pass_progress (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  season_id       uuid NOT NULL REFERENCES battle_pass_seasons(id) ON DELETE CASCADE,
  current_level   int NOT NULL DEFAULT 1,
  current_xp      int NOT NULL DEFAULT 0,
  claimed_levels  int[] DEFAULT '{}',
  is_premium      boolean NOT NULL DEFAULT false,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, season_id)
);

CREATE TABLE IF NOT EXISTS challenges (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type            text NOT NULL CHECK (type IN ('daily','weekly')),
  title           text NOT NULL,
  target_km       numeric(8,2),
  target_count    int,
  target_days     int,
  current_value   numeric(8,2) NOT NULL DEFAULT 0,
  xp_reward       int NOT NULL DEFAULT 50,
  completed       boolean NOT NULL DEFAULT false,
  completed_at    timestamptz,
  expires_at      timestamptz NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS league_snapshots (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  league          text NOT NULL,
  week_number     int NOT NULL,
  year            int NOT NULL,
  rank            int,
  weekly_km       numeric(8,2) NOT NULL DEFAULT 0,
  promoted        boolean DEFAULT false,
  demoted         boolean DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_number, year)
);

CREATE TABLE IF NOT EXISTS notifications_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type            text NOT NULL,
  title           text NOT NULL,
  body            text NOT NULL,
  read            boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ── 3. AUTO-CREATE GAME PROFILE TRIGGER ──────────────────────────────────────
CREATE OR REPLACE FUNCTION create_game_profile_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO game_profiles (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_create_game_profile ON profiles;
CREATE TRIGGER trg_create_game_profile
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_game_profile_on_signup();

-- ── 4. BACKFILL DATA (If missing) ────────────────────────────────────────────
INSERT INTO game_profiles (user_id)
SELECT id FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM game_profiles gp WHERE gp.user_id = p.id
)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO battle_pass_seasons (season_number, name, start_date, end_date, total_levels, is_active)
VALUES (1, 'Season 1 — Rise', '2026-05-01 00:00:00+00', '2026-05-31 23:59:59+00', 50, true)
ON CONFLICT (season_number) DO NOTHING;

INSERT INTO battle_pass_progress (user_id, season_id)
SELECT p.id, s.id
FROM profiles p
CROSS JOIN battle_pass_seasons s
WHERE s.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM battle_pass_progress bpp
    WHERE bpp.user_id = p.id AND bpp.season_id = s.id
  )
ON CONFLICT (user_id, season_id) DO NOTHING;

-- ── 5. SECURITY POLICIES (RLS) ───────────────────────────────────────────────
ALTER TABLE game_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_pass_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_pass_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications_log ENABLE ROW LEVEL SECURITY;

-- game_profiles
DROP POLICY IF EXISTS "game_profiles_own" ON game_profiles;
DROP POLICY IF EXISTS "game_profiles_select_all" ON game_profiles;
DROP POLICY IF EXISTS "game_profiles_modify_own" ON game_profiles;

CREATE POLICY "game_profiles_select_all" ON game_profiles FOR SELECT USING (true);
CREATE POLICY "game_profiles_modify_own" ON game_profiles FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- battles
DROP POLICY IF EXISTS "battles_select" ON battles;
DROP POLICY IF EXISTS "battles_modify" ON battles;
CREATE POLICY "battles_select" ON battles FOR SELECT USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);
CREATE POLICY "battles_modify" ON battles FOR ALL USING (auth.uid() = challenger_id OR auth.uid() = opponent_id) WITH CHECK (auth.uid() = challenger_id OR auth.uid() = opponent_id);

-- battle pass
DROP POLICY IF EXISTS "seasons_read_all" ON battle_pass_seasons;
CREATE POLICY "seasons_read_all" ON battle_pass_seasons FOR SELECT USING (true);

DROP POLICY IF EXISTS "bp_progress_own" ON battle_pass_progress;
CREATE POLICY "bp_progress_own" ON battle_pass_progress FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- challenges
DROP POLICY IF EXISTS "challenges_own" ON challenges;
CREATE POLICY "challenges_own" ON challenges FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- leagues & notifications
DROP POLICY IF EXISTS "leagues_own" ON league_snapshots;
CREATE POLICY "leagues_own" ON league_snapshots FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notif_own" ON notifications_log;
CREATE POLICY "notif_own" ON notifications_log FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
