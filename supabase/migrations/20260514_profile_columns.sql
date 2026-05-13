-- ═══════════════════════════════════════════════
-- ADD MISSING PROFILE COLUMNS + AUTO-CREATE GAME PROFILE
-- Run this in the Supabase SQL Editor
-- ═══════════════════════════════════════════════

-- ── PROFILE COLUMNS (settings that currently fail silently) ────────────────
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

-- ── AUTO-CREATE GAME PROFILE WHEN PROFILE IS CREATED ──────────────────────
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

-- ── BACKFILL: create game_profiles for existing users that don't have one ──
INSERT INTO game_profiles (user_id)
SELECT id FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM game_profiles gp WHERE gp.user_id = p.id
)
ON CONFLICT (user_id) DO NOTHING;

-- ── BACKFILL: create battle_pass_progress for existing users ───────────────
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

-- ── Allow battle_pass_seasons to be read by all authenticated users ────────
ALTER TABLE battle_pass_seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "seasons_read_all" ON battle_pass_seasons
  FOR SELECT USING (true);

-- ── Allow game_profiles to be read by all (for leaderboard) ────────────────
DROP POLICY IF EXISTS "game_profiles_own" ON game_profiles;
CREATE POLICY "game_profiles_select_all" ON game_profiles
  FOR SELECT USING (true);
CREATE POLICY "game_profiles_modify_own" ON game_profiles
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
