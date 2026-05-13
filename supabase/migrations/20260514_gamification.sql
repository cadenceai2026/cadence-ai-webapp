-- ═══════════════════════════════════════════════
-- CADENCE GAMIFICATION SCHEMA
-- ═══════════════════════════════════════════════

-- ── GAME PROFILES ──────────────────────────────
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

-- ── BATTLES ────────────────────────────────────
CREATE TABLE IF NOT EXISTS battles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opponent_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenger_km   numeric(8,2) NOT NULL DEFAULT 0,
  opponent_km     numeric(8,2) NOT NULL DEFAULT 0,
  winner_id       uuid REFERENCES auth.users(id),
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','completed','cancelled')),
  battle_type     text NOT NULL DEFAULT 'weekly_km',
  title           text,
  week_number     int,
  start_date      timestamptz NOT NULL DEFAULT now(),
  end_date        timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ── RIVAL ASSIGNMENTS ──────────────────────────
CREATE TABLE IF NOT EXISTS rival_assignments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rival_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_week   int  NOT NULL,
  assigned_year   int  NOT NULL,
  user_wins       int  NOT NULL DEFAULT 0,
  rival_wins      int  NOT NULL DEFAULT 0,
  is_active       bool NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, assigned_week, assigned_year)
);

-- ── BATTLE PASS SEASONS ────────────────────────
CREATE TABLE IF NOT EXISTS battle_pass_seasons (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_number   int  NOT NULL UNIQUE,
  name            text NOT NULL,
  start_date      date NOT NULL,
  end_date        date NOT NULL,
  total_levels    int  NOT NULL DEFAULT 50,
  is_active       bool NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ── BATTLE PASS PROGRESS ───────────────────────
CREATE TABLE IF NOT EXISTS battle_pass_progress (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  season_id       uuid NOT NULL REFERENCES battle_pass_seasons(id) ON DELETE CASCADE,
  current_level   int  NOT NULL DEFAULT 1,
  current_xp      int  NOT NULL DEFAULT 0,
  claimed_levels  int[] NOT NULL DEFAULT '{}',
  is_premium      bool NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, season_id)
);

-- ── CHALLENGES ─────────────────────────────────
CREATE TABLE IF NOT EXISTS challenges (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type            text NOT NULL CHECK (type IN ('daily','weekly')),
  title           text NOT NULL,
  description     text,
  target_km       numeric(6,2),
  target_days     int,
  target_count    int,
  xp_reward       int  NOT NULL DEFAULT 50,
  current_value   numeric(8,2) NOT NULL DEFAULT 0,
  completed       bool NOT NULL DEFAULT false,
  completed_at    timestamptz,
  expires_at      timestamptz NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ── LEAGUE SNAPSHOTS (weekly) ──────────────────
CREATE TABLE IF NOT EXISTS league_snapshots (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  league          text NOT NULL,
  week_number     int  NOT NULL,
  year            int  NOT NULL,
  weekly_km       numeric(8,2) NOT NULL DEFAULT 0,
  rank_in_league  int,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_number, year)
);

-- ── IN-APP NOTIFICATIONS ───────────────────────
CREATE TABLE IF NOT EXISTS notifications_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type            text NOT NULL,
  title           text NOT NULL,
  body            text,
  read            bool NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ── RLS POLICIES ───────────────────────────────
ALTER TABLE game_profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE battles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE rival_assignments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_pass_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges           ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_snapshots     ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications_log    ENABLE ROW LEVEL SECURITY;

-- game_profiles: users see only their own
CREATE POLICY "game_profiles_own" ON game_profiles
  FOR ALL USING (auth.uid() = user_id);

-- battles: players see their own battles
CREATE POLICY "battles_own" ON battles
  FOR ALL USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

-- rival_assignments: users see their own
CREATE POLICY "rivals_own" ON rival_assignments
  FOR ALL USING (auth.uid() = user_id);

-- battle_pass_progress: own only
CREATE POLICY "bpp_own" ON battle_pass_progress
  FOR ALL USING (auth.uid() = user_id);

-- challenges: own only
CREATE POLICY "challenges_own" ON challenges
  FOR ALL USING (auth.uid() = user_id);

-- league_snapshots: read all (leaderboard), write own
CREATE POLICY "leagues_read_all"  ON league_snapshots FOR SELECT USING (true);
CREATE POLICY "leagues_write_own" ON league_snapshots
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- notifications: own only
CREATE POLICY "notifs_own" ON notifications_log
  FOR ALL USING (auth.uid() = user_id);

-- ── SEED SEASON 1 ──────────────────────────────
INSERT INTO battle_pass_seasons (season_number, name, start_date, end_date, total_levels, is_active)
VALUES (1, 'Season 1 — Rise', '2026-05-01', '2026-05-31', 50, true)
ON CONFLICT (season_number) DO NOTHING;
