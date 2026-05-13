/**
 * game.js — Core XP engine, level system, mock data, and game boot.
 */
import { supabase } from './supabase-client.js';
import { state } from './state.js';
import { toast } from './utils.js';

// ── XP THRESHOLDS (non-linear — fast early wins, grind later) ────────────────
export function xpForLevel(level) {
  if (level <= 0)  return 0;
  if (level <= 10) return level * 100;                        // 100 XP / level
  if (level <= 30) return 1000 + (level - 10) * 250;         // 250 XP / level
  return 6000 + (level - 30) * 600;                          // 600 XP / level
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
  if (streakDays >= 7)  xp = Math.round(xp * 1.5);
  else if (streakDays >= 3) xp = Math.round(xp * 1.2);
  if (battleWon) xp += 200;
  xp += challengeXP;
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

// ── MOCK DATA (shown when DB tables not yet populated) ────────────────────────
export function getMockGameProfile(weeklyKm = 12.3) {
  const totalXP = xpForLevel(7) + 850;
  return {
    user_id:      state.user?.id || 'demo',
    level:        levelFromXP(totalXP),
    total_xp:     totalXP,
    season_xp:    850,
    league:       'silver',
    streak_days:  4,
    last_run_date: new Date(Date.now() - 86400000).toISOString(),
    weekly_km:    weeklyKm,
    total_km:     142.8,
    battles_won:  3,
    battles_lost: 2,
    _isMock:      true,
  };
}

export function getMockRival() {
  return {
    id:           'rival_demo',
    display_name: 'Alex M.',
    level:        8,
    league:       'silver',
    weekly_km:    14.1,
    avatar_initial: 'A',
    battles_won:  5,
    battles_lost: 2,
    win_streak:   2,
    _isMock:      true,
  };
}

export function getMockBattle() {
  const now  = Date.now();
  return {
    id:             'battle_demo',
    status:         'active',
    challenger_km:  12.3,
    opponent_km:    14.1,
    challenger_name: state.profile?.display_name || 'You',
    opponent_name:  'Alex M.',
    start_date:     new Date(now - 3 * 86400000).toISOString(),
    end_date:       new Date(now + 4 * 86400000).toISOString(),
    type:           'weekly_km',
    title:          'Weekly Battle',
    week_number:    20,
    _isMock:        true,
  };
}

export function getMockBattlePass() {
  return {
    season: { season_number: 1, name: 'Season 1 — Rise', start_date: '2026-05-01', end_date: '2026-05-31', total_levels: 50 },
    progress: { current_level: 12, current_xp: 340, is_premium: false, claimed_levels: [1,2,3,4,5,6,7,8,9,10,11] },
    _isMock: true,
  };
}

export function getMockChallenges() {
  const now = new Date();
  const endOfDay = new Date(now); endOfDay.setHours(23,59,59,0);
  const nextMonday = new Date(now);
  const daysUntilMon = (8 - nextMonday.getDay()) % 7 || 7;
  nextMonday.setDate(nextMonday.getDate() + daysUntilMon);
  nextMonday.setHours(0,0,0,0);

  return [
    { id: 'ch1', type: 'daily',  title: 'Run 3 km today',          target_km:   3,  current_value: 1.2, xp_reward: 50,  completed: false, expires_at: endOfDay.toISOString()  },
    { id: 'ch2', type: 'weekly', title: 'Log 3 runs this week',    target_count: 3, current_value: 2,   xp_reward: 100, completed: false, expires_at: nextMonday.toISOString()},
    { id: 'ch3', type: 'weekly', title: 'Cover 20 km this week',   target_km:  20,  current_value: 12.3,xp_reward: 150, completed: false, expires_at: nextMonday.toISOString()},
  ];
}

export function getMockLeaderboard() {
  const displayName = state.profile?.display_name || 'You';
  return [
    { rank: 1, name: 'María G.',  km: 28.4, level: 12, isUser: false, avatar: 'M' },
    { rank: 2, name: 'Carlos R.', km: 24.8, level: 10, isUser: false, avatar: 'C' },
    { rank: 3, name: 'Anna K.',   km: 19.2, level:  9, isUser: false, avatar: 'A' },
    { rank: 4, name: displayName, km: 12.3, level:  7, isUser: true,  avatar: displayName[0]?.toUpperCase() || 'Y' },
    { rank: 5, name: 'Pedro L.',  km: 10.1, level:  6, isUser: false, avatar: 'P' },
    { rank: 6, name: 'James W.',  km:  8.9, level:  5, isUser: false, avatar: 'J' },
    { rank: 7, name: 'Sofia M.',  km:  7.2, level:  5, isUser: false, avatar: 'S' },
    { rank: 8, name: 'David H.',  km:  5.8, level:  4, isUser: false, avatar: 'D' },
  ];
}

// ── LOAD GAME PROFILE FROM DB (with mock fallback) ────────────────────────────
export async function loadGameProfile() {
  if (!state.user) {
    state.gameProfile = getMockGameProfile();
    return;
  }
  try {
    const weeklyKm = getWeeklyKmFromActivities();
    const { data, error } = await supabase
      .from('game_profiles')
      .select('*')
      .eq('user_id', state.user.id)
      .maybeSingle();
    if (error || !data) {
      state.gameProfile = getMockGameProfile(weeklyKm || 12.3);
    } else {
      state.gameProfile = { ...data, weekly_km: weeklyKm || data.weekly_km };
    }
  } catch {
    state.gameProfile = getMockGameProfile();
  }
}

// ── AWARD XP + ANIMATE ────────────────────────────────────────────────────────
export function awardXP(amount, reason = '') {
  if (!state.gameProfile) return;
  const before = state.gameProfile.total_xp;
  state.gameProfile.total_xp    += amount;
  state.gameProfile.season_xp   += amount;
  state.gameProfile.level       = levelFromXP(state.gameProfile.total_xp);

  if (reason) toast(`+${amount} XP — ${reason} 🎯`);
  checkLevelUp(levelFromXP(before), state.gameProfile.level);
  refreshGameUI();
}

function checkLevelUp(oldLevel, newLevel) {
  if (newLevel > oldLevel) {
    import('./notifications.js').then(({ showLevelUp }) => showLevelUp(newLevel));
  }
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
}

// ── INIT ──────────────────────────────────────────────────────────────────────
export async function initGame() {
  await loadGameProfile();
  state.gameLoaded = true;
  refreshGameUI();
}
