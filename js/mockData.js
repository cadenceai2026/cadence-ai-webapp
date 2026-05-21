/**
 * mockData.js — Engine for simulating bots, rival runs, and Phase 1 demo data.
 * This guarantees the user always has a rival and active competition, even if no real users are around.
 */

import { supabase } from './supabase-client.js';
import { state } from './state.js';
import { toast } from './utils.js';
import { getWeeklyKmFromActivities } from './game.js';

// Random names and avatars for bots
const BOT_NAMES = ['Alex Runner', 'Sam Sprint', 'Jamie Jog', 'Taylor Track', 'Jordan Dash'];

export async function ensureBotRival(userId) {
  // Try to find an existing active battle for this user
  const { data: battle } = await supabase
    .from('battles')
    .select('*')
    .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`)
    .eq('status', 'active')
    .maybeSingle();

  if (battle) {
    // There is an active battle. Simulate bot activity if the opponent is a bot.
    await simulateBotActivity(battle);
    return battle;
  }

  // Create a new bot and battle
  const botId = crypto.randomUUID();
  const botName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
  
  // Create bot profile in local state / mock db
  // In a real scenario, you might want to insert this into game_profiles with is_bot = true
  const { error: profileErr } = await supabase.from('profiles').insert({
    id: botId,
    display_name: botName
  });

  const { error: gameProfileErr } = await supabase.from('game_profiles').insert({
    user_id: botId,
    is_bot: true,
    level: state.gameProfile?.level || 1,
    league: state.gameProfile?.league || 'bronze',
    weekly_km: getWeeklyKmFromActivities() * 0.8 // Start slightly behind
  });

  if (profileErr || gameProfileErr) {
    console.warn("Could not insert bot profile, it may already exist or offline mode.");
  }

  // Start battle
  const now = new Date();
  const weekNumber = Math.ceil((now - new Date(now.getFullYear(), 0, 1)) / (7 * 86400000));
  const endDate = new Date(now.getTime() + 7 * 86400000);

  const { data: newBattle, error: battleErr } = await supabase
    .from('battles')
    .insert({
      challenger_id: userId,
      opponent_id: botId,
      challenger_km: getWeeklyKmFromActivities().toFixed(2),
      opponent_km: (getWeeklyKmFromActivities() * 0.8).toFixed(2), // 80% of user score
      status: 'active',
      battle_type: 'weekly_km',
      title: 'Weekly Battle',
      week_number: weekNumber,
      end_date: endDate.toISOString()
    })
    .select()
    .single();

  if (battleErr) {
    console.error("Failed to create bot battle:", battleErr);
    return null;
  }

  // Attach bot name to the returned object so frontend can display it
  newBattle._opponent_name = botName;

  return newBattle;
}

export async function simulateBotActivity(battle) {
  // If opponent isn't a bot, do nothing
  if (!battle || battle.challenger_id !== state.user?.id) return;
  
  // Chance to simulate activity
  if (Math.random() > 0.3) return; // 70% chance to do nothing this load

  const currentOppKm = parseFloat(battle.opponent_km || 0);
  const currentChallengerKm = parseFloat(battle.challenger_km || 0);
  
  // Bot wants to catch up or take slight lead
  const targetKm = currentChallengerKm + (Math.random() * 2); // Ahead by up to 2km
  const increment = targetKm > currentOppKm ? targetKm - currentOppKm : Math.random() * 1.5;

  const newOppKm = (currentOppKm + increment).toFixed(2);
  
  await supabase
    .from('battles')
    .update({ opponent_km: newOppKm })
    .eq('id', battle.id);
  
  // We don't want to alert user constantly, but maybe if they just got passed
  if (currentOppKm <= currentChallengerKm && parseFloat(newOppKm) > currentChallengerKm) {
    toast(`⚠️ Warning: ${battle._opponent_name || 'Your rival'} just took the lead!`);
  }
}
