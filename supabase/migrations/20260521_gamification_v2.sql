-- Migration: Add bot and anti-frustration mechanics to gamification system

ALTER TABLE game_profiles 
ADD COLUMN IF NOT EXISTS is_bot BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS bot_pace_km_per_day NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS loss_streak INT NOT NULL DEFAULT 0;

ALTER TABLE battles
ADD COLUMN IF NOT EXISTS is_bot_match BOOLEAN NOT NULL DEFAULT false;
