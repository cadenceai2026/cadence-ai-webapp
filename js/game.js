/**
 * game.js — Core XP engine, level system, real DB operations, and game boot.
 */
import { supabase } from './supabase-client.js';
import { state } from './state.js';
import { toast } from './utils.js';

// ── XP THRESHOLDS (non-linear — fast early wins, grind later) ────────────────
export function xpForLevel(level) {
  if (level <= 1)  return 0;
  if (level <= 10) return (level - 1) * 100;                 // 100 XP / level
  if (level <= 30) return 900 + (level - 10) * 250;          // 250 XP / level
  return 5900 + (level - 30) * 600;                          // 600 XP / level
}

export function levelFromXP(totalXP) {
  let level = 1;
  while (level < 100 && xpForLevel(level + 1) <= totalXP) level++;
  return level;
}

export function xpProgressInLevel(totalXP) {
  const lvl = levelFromXP(totalXP);
  return totalXP - xpForLevel(lvl);
}

export function xpNeededForNextLevel(totalXP) {
  const lvl = levelFromXP(totalXP);
  return xpForLevel(lvl + 1) - xpForLevel(lvl);
}

// ── XP AWARD FORMULA ─────────────────────────────────────────────────────────
export function calculateXP({ km = 0, battleWon = false, challengeXP = 0, streakDays = 0 }) {
  let xp = Math.round(km * 10);
  
  // Streak bonus: 1.2x if streak >= 3
  if (streakDays >= 3) xp = Math.round(xp * 1.2);
  
  // Battle win: +200 XP
  if (battleWon) xp += 200;
  
  // Challenge XP: +50-150 XP
  xp += challengeXP;
  
  // Early levels (1-10) = 2x XP
  const currentLevel = state.gameProfile?.level || 1;
  if (currentLevel <= 10) {
    xp *= 2;
  }
  
  return xp;
}

// ── LEAGUE HELPERS ────────────────────────────────────────────────────────────
export const LEAGUES = {
  bronze: { name: 'Bronze', color: '#CD7F32', minKm: 0,  maxKm: 15,  emoji: '🥉' },
  silver: { name: 'Silver', color: '#A8A8A8', minKm: 15, maxKm: 30,  emoji: '🥈' },
  gold:   { name: 'Gold',   color: '#FFD700', minKm: 30, maxKm: 50,  emoji: '🥇' },
  elite:  { name: 'Elite',  color: '#00E5A0', minKm: 50, maxKm: 999, emoji: '👑' },
};

export function leagueFromWeeklyKm(km) {
  if (km >= 50) return 'elite';
  if (km >= 30) return 'gold';
  if (km >= 15) return 'silver';
  return 'bronze';
}

// ── WEEK HELPERS ──────────────────────────────────────────────────────────────
export function getWeeklyKmFromActivities() {
  const now  = Date.now();
  const week = 7 * 24 * 3600 * 1000;
  return (state.activities || [])
    .filter(a => {
      const d = new Date(a.start_date_local || a.start_date);
      return (now - d.getTime()) < week &&
             (a.sport_type === 'Run' || a.sport_type === 'TrailRun');
    })
    .reduce((sum, a) => sum + (a.distance || 0) / 1000, 0);
}

// ── STREAK CALCULATION ────────────────────────────────────────────────────────
export function calculateStreakFromActivities() {
  const runs = (state.activities || [])
    .filter(a => a.sport_type === 'Run' || a.sport_type === 'TrailRun')
    .sort((a, b) => new Date(b.start_date) - new Date(a.start_date));

  if (!runs.length) return { streak: 0, lastRunDate: null };

  // Build set of unique run dates (local time)
  const runDays = new Set();
  runs.forEach(r => {
    const d = new Date(r.start_date_local || r.start_date);
    runDays.add(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
  });

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,'0')}-${String(yesterday.getDate()).padStart(2,'0')}`;

  // Streak starts from today or yesterday
  let streak = 0;
  let checkDate = new Date(today);

  if (runDays.has(todayStr)) {
    // Start counting from today
  } else if (runDays.has(yesterdayStr)) {
    checkDate = new Date(yesterday);
  } else {
    return { streak: 0, lastRunDate: runs[0] ? new Date(runs[0].start_date).toISOString().split('T')[0] : null };
  }

  while (true) {
    const ds = `${checkDate.getFullYear()}-${String(checkDate.getMonth()+1).padStart(2,'0')}-${String(checkDate.getDate()).padStart(2,'0')}`;
    if (runDays.has(ds)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  const lastRunDate = runs[0] ? new Date(runs[0].start_date).toISOString().split('T')[0] : null;
  return { streak, lastRunDate };
}

// ── TOTAL KM FROM ACTIVITIES ─────────────────────────────────────────────────
export function getTotalKmFromActivities() {
  return (state.activities || [])
    .filter(a => a.sport_type === 'Run' || a.sport_type === 'TrailRun')
    .reduce((sum, a) => sum + (a.distance || 0) / 1000, 0);
}

// ── LOAD GAME PROFILE FROM DB (create if missing) ─────────────────────────────
export async function loadGameProfile() {
  if (!state.user) {
    state.gameProfile = getDefaultGameProfile();
    return;
  }
  try {
    const { data, error } = await supabase
      .from('game_profiles')
      .select('*')
      .eq('user_id', state.user.id)
      .maybeSingle();

    if (error) {
      console.error('loadGameProfile error:', error);
      state.gameProfile = getDefaultGameProfile();
      return;
    }

    if (!data) {
      // Auto-create game profile
      const { data: created, error: createErr } = await supabase
        .from('game_profiles')
        .insert({ user_id: state.user.id })
        .select()
        .single();

      if (createErr) {
        console.error('create game_profile error:', createErr);
        state.gameProfile = getDefaultGameProfile();
      } else {
        state.gameProfile = created;
      }
    } else {
      state.gameProfile = data;
    }

    // Recalculate live fields from activities
    recalcGameFromActivities();
  } catch (err) {
    console.error('loadGameProfile unexpected:', err);
    state.gameProfile = getDefaultGameProfile();
  }
}

function getDefaultGameProfile() {
  return {
    user_id: state.user?.id || 'unknown',
    level: 1,
    total_xp: 0,
    season_xp: 0,
    league: 'bronze',
    streak_days: 0,
    last_run_date: null,
    weekly_km: 0,
    total_km: 0,
    battles_won: 0,
    battles_lost: 0,
  };
}

// ── RECALCULATE GAME STATE FROM REAL ACTIVITIES ───────────────────────────────
export function recalcGameFromActivities() {
  if (!state.gameProfile) return;

  const weeklyKm = getWeeklyKmFromActivities();
  const totalKm = getTotalKmFromActivities();
  const { streak, lastRunDate } = calculateStreakFromActivities();
  const league = leagueFromWeeklyKm(weeklyKm);

  state.gameProfile.weekly_km = parseFloat(weeklyKm.toFixed(2));
  state.gameProfile.total_km = parseFloat(totalKm.toFixed(2));
  state.gameProfile.streak_days = streak;
  state.gameProfile.last_run_date = lastRunDate;
  state.gameProfile.league = league;
  state.gameProfile.level = levelFromXP(state.gameProfile.total_xp);
}

// ── PERSIST GAME PROFILE TO DB ────────────────────────────────────────────────
export async function saveGameProfile() {
  if (!state.user || !state.gameProfile) return;

  const gp = state.gameProfile;
  const { error } = await supabase
    .from('game_profiles')
    .update({
      level: gp.level,
      total_xp: gp.total_xp,
      season_xp: gp.season_xp,
      league: gp.league,
      streak_days: gp.streak_days,
      last_run_date: gp.last_run_date,
      weekly_km: gp.weekly_km,
      total_km: gp.total_km,
      battles_won: gp.battles_won,
      battles_lost: gp.battles_lost,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', state.user.id);

  if (error) console.error('saveGameProfile error:', error);
}

// ── AWARD XP + PERSIST + ANIMATE ──────────────────────────────────────────────
export async function awardXP(amount, reason = '') {
  if (!state.gameProfile) return;
  const before = state.gameProfile.total_xp;
  state.gameProfile.total_xp    += amount;
  state.gameProfile.season_xp   += amount;
  state.gameProfile.level       = levelFromXP(state.gameProfile.total_xp);

  if (reason) toast(`+${amount} XP — ${reason} 🎯`);
  checkLevelUp(levelFromXP(before), state.gameProfile.level);
  refreshGameUI();

  // Persist to DB in background
  await saveGameProfile();
}

function checkLevelUp(oldLevel, newLevel) {
  if (newLevel > oldLevel) {
    import('./notifications.js').then(({ showLevelUp }) => showLevelUp(newLevel));
  }
}

// ── FULL POST-SYNC RECALCULATION ──────────────────────────────────────────────
export async function recalcAndPersistAfterSync() {
  if (!state.gameProfile) return;

  const oldXP = state.gameProfile.total_xp;
  recalcGameFromActivities();

  // Award XP for new km since last recalc
  const weeklyKm = state.gameProfile.weekly_km;
  const newXP = calculateXP({
    km: weeklyKm,
    streakDays: state.gameProfile.streak_days,
  });

  // Only award difference to avoid double-counting
  if (newXP > oldXP && oldXP === 0) {
    state.gameProfile.total_xp = newXP;
    state.gameProfile.season_xp = newXP;
    state.gameProfile.level = levelFromXP(newXP);
  }

  await saveGameProfile();
  refreshGameUI();
}

// ── XP BAR RENDERER (used by dashboard + battlepass) ─────────────────────────
export function renderXPBar(containerId) {
  const el = document.getElementById(containerId);
  if (!el || !state.gameProfile) return;
  const gp     = state.gameProfile;
  const prog   = xpProgressInLevel(gp.total_xp);
  const needed = xpNeededForNextLevel(gp.total_xp);
  const pct    = Math.min(100, (prog / needed) * 100);
  const league = LEAGUES[gp.league] || LEAGUES.bronze;

  el.innerHTML = `
    <div class="xp-bar-wrap">
      <div class="xp-level-badge" style="border-color:${league.color}">
        <span class="xp-level-num">${gp.level}</span>
        <span class="xp-level-lbl">LVL</span>
      </div>
      <div class="xp-bar-col">
        <div class="xp-bar-labels">
          <span class="xp-label">${prog.toLocaleString()} XP</span>
          <span class="xp-label-next">${needed.toLocaleString()} to level ${gp.level + 1}</span>
        </div>
        <div class="xp-track">
          <div class="xp-fill" id="${containerId}-fill" style="width:0%"></div>
        </div>
      </div>
      <div class="xp-league-badge" style="background:${league.color}22;border-color:${league.color}44;color:${league.color}">
        ${league.emoji} ${league.name}
      </div>
    </div>`;

  // Animate in
  requestAnimationFrame(() => {
    setTimeout(() => {
      const fill = document.getElementById(`${containerId}-fill`);
      if (fill) fill.style.width = `${pct}%`;
    }, 120);
  });
}

// ── STREAK BADGE RENDERER ─────────────────────────────────────────────────────
export function renderStreakBadge(containerId) {
  const el = document.getElementById(containerId);
  if (!el || !state.gameProfile) return;
  const days = state.gameProfile.streak_days || 0;
  const hot  = days >= 3;
  el.innerHTML = `
    <div class="streak-badge ${hot ? 'streak-hot' : ''}">
      <span class="streak-flame">${hot ? '🔥' : '⚡'}</span>
      <span class="streak-count">${days}</span>
      <span class="streak-lbl">day streak</span>
    </div>`;
}

// ── REFRESH ALL GAME UI ───────────────────────────────────────────────────────
export function refreshGameUI() {
  renderXPBar('dash-xp-bar');
  renderStreakBadge('dash-streak');
  applySimplicityRule();
}

// ── SIMPLICITY RULE (Hide features for level < 3) ─────────────────────────────
function applySimplicityRule() {
  const level = state.gameProfile?.level || 1;
  const isSimple = level < 3;
  
  // Hide leagues and battle pass tabs/elements if level < 3
  const advancedEls = document.querySelectorAll('.advanced-feature');
  advancedEls.forEach(el => {
    el.style.display = isSimple ? 'none' : '';
  });
}

// ── INIT ──────────────────────────────────────────────────────────────────────
export async function initGame() {
  await loadGameProfile();
  state.gameLoaded = true;
  refreshGameUI();
}
