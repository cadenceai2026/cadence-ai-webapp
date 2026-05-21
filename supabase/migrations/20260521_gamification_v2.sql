-- Gamification v2 Schema Update

-- 1. Extend game_profiles
ALTER TABLE game_profiles 
  ADD COLUMN IF NOT EXISTS streak_days int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_active_date date,
  ADD COLUMN IF NOT EXISTS battles_won int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS battles_lost int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS battle_pass_level int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_bot boolean DEFAULT false;

-- 2. Rivalries Table
CREATE TABLE IF NOT EXISTS rivalries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES game_profiles(user_id) ON DELETE CASCADE,
  rival_id uuid REFERENCES game_profiles(user_id) ON DELETE CASCADE,
  status text CHECK (status IN ('active', 'historical')) DEFAULT 'active',
  created_at timestamp with time zone DEFAULT now(),
  ended_at timestamp with time zone
);

-- 3. Mock Activities Table (For bot simulated runs)
CREATE TABLE IF NOT EXISTS mock_activities (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES game_profiles(user_id) ON DELETE CASCADE,
  distance_km float NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Note: battles and challenges tables already exist, but we ensure their structures align via JS logic.

-- RLS Policies
ALTER TABLE rivalries ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rivalries" ON rivalries
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = rival_id);

CREATE POLICY "Users can insert their own rivalries" ON rivalries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rivalries" ON rivalries
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = rival_id);

CREATE POLICY "Public read for mock_activities" ON mock_activities
  FOR SELECT USING (true);
