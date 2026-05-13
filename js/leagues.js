/**
 * leagues.js — Weekly league leaderboard from real DB data.
 */
import { supabase } from './supabase-client.js';
import { state } from './state.js';
import { qs } from './utils.js';
import { LEAGUES } from './game.js';

// ── LOAD REAL LEADERBOARD ─────────────────────────────────────────────────────
async function loadLeagueData(forceLeague) {
  if (!state.user) {
    state.leaderboard = [];
    return;
  }

  const league = forceLeague || state.gameProfile?.league || 'bronze';

  try {
    // Fetch all game_profiles in this league (with display names from profiles)
    const { data, error } = await supabase
      .from('game_profiles')
      .select('user_id, level, weekly_km, total_xp')
      .eq('league', league)
      .order('weekly_km', { ascending: false })
      .limit(20);

    if (error) {
      console.error('loadLeagueData error:', error);
      state.leaderboard = buildSoloLeaderboard(league);
      return;
    }

    if (!data || data.length === 0) {
      state.leaderboard = buildSoloLeaderboard(league);
      return;
    }

    // Fetch display names for these users
    const userIds = data.map(d => d.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', userIds);

    const nameMap = {};
    (profiles || []).forEach(p => { nameMap[p.id] = p.display_name; });

    state.leaderboard = data.map((row, idx) => ({
      rank: idx + 1,
      name: nameMap[row.user_id] || 'Runner',
      km: parseFloat(row.weekly_km) || 0,
      level: row.level || 1,
      isUser: row.user_id === state.user.id,
      avatar: (nameMap[row.user_id] || 'R')[0]?.toUpperCase() || 'R',
    }));

    // Make sure current user is in the leaderboard
    if (!state.leaderboard.some(r => r.isUser)) {
      const gp = state.gameProfile || {};
      state.leaderboard.push({
        rank: state.leaderboard.length + 1,
        name: state.profile?.display_name || 'You',
        km: parseFloat(gp.weekly_km) || 0,
        level: gp.level || 1,
        isUser: true,
        avatar: (state.profile?.display_name || 'Y')[0]?.toUpperCase() || 'Y',
      });
      // Re-sort and re-rank
      state.leaderboard.sort((a, b) => b.km - a.km);
      state.leaderboard.forEach((r, i) => r.rank = i + 1);
    }

  } catch (err) {
    console.error('loadLeagueData unexpected:', err);
    state.leaderboard = buildSoloLeaderboard(league);
  }
}

function buildSoloLeaderboard(league) {
  const gp = state.gameProfile || {};
  const displayName = state.profile?.display_name || 'You';
  return [
    {
      rank: 1,
      name: displayName,
      km: parseFloat(gp.weekly_km) || 0,
      level: gp.level || 1,
      isUser: true,
      avatar: displayName[0]?.toUpperCase() || 'Y',
    },
  ];
}

// ── DAYS UNTIL MONDAY ─────────────────────────────────────────────────────────
function daysUntilMonday() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const d   = day === 0 ? 1 : 8 - day;
  return d;
}

// ── RENDER LEAGUE SCREEN ──────────────────────────────────────────────────────
export async function renderLeague() {
  const gp      = state.gameProfile;
  const league  = gp?.league || 'bronze';

  await loadLeagueData(league);

  const info    = LEAGUES[league];
  const board   = state.leaderboard;
  const userRow = board.find(r => r.isUser);
  const userKm  = userRow?.km || 0;
  const resetIn = daysUntilMonday();

  // Tier tabs — highlight active
  document.querySelectorAll('.league-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.league === league);
  });

  // League header
  const hdrEl = qs('#league-header');
  if (hdrEl) {
    const toNext    = nextTierKm(league, userKm);
    hdrEl.innerHTML = `
      <div class="league-tier-badge" style="background:${info.color}22;border-color:${info.color}44;color:${info.color}">
        ${info.emoji} ${info.name} League
      </div>
      <div class="league-reset-info">Resets in <strong>${resetIn} day${resetIn !== 1 ? 's' : ''}</strong></div>
      ${toNext ? `<div class="league-promote-hint">Run <strong>${toNext.toFixed(1)} more km</strong> to reach ${toNext > 0 ? nextTierName(league) : ''}! 🚀</div>` : '<div class="league-promote-hint elite">👑 You are in the top tier!</div>'}`;
  }

  // Leaderboard rows
  const listEl = qs('#league-list');
  if (!listEl) return;

  if (!board.length) {
    listEl.innerHTML = '<div class="empty">No runners in your league yet.</div>';
    return;
  }

  const totalRows = board.length;
  listEl.innerHTML = board.map((row, idx) => {
    const isPromo  = idx < 3;
    const isDemote = idx >= totalRows - 2 && totalRows > 4;
    const rank     = row.rank;
    const medal    = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
    const zone     = isPromo ? 'zone-promo' : isDemote ? 'zone-demote' : '';

    return `
      <div class="league-row ${row.isUser ? 'league-row-you' : ''} ${zone}">
        ${isPromo && idx === 0  ? '<div class="zone-label promo-label">▲ Promotion Zone</div>'  : ''}
        ${isDemote && idx === totalRows - 2 ? '<div class="zone-label demote-label">▼ Demotion Zone</div>' : ''}
        <div class="league-rank">${medal}</div>
        <div class="league-av" style="background:${row.isUser ? info.color + '22' : 'var(--surface3)'};
             color:${row.isUser ? info.color : 'var(--muted)'}">
          ${row.avatar || row.name[0]}
        </div>
        <div class="league-name-col">
          <div class="league-name">${row.name}${row.isUser ? ' (You)' : ''}</div>
          <div class="league-level">Level ${row.level}</div>
        </div>
        <div class="league-km" style="color:${row.isUser ? info.color : 'var(--text)'}">
          ${row.km.toFixed(1)} <span>km</span>
        </div>
      </div>`;
  }).join('');
}

function nextTierKm(league, userKm) {
  if (league === 'bronze') return Math.max(0, 15 - userKm);
  if (league === 'silver') return Math.max(0, 30 - userKm);
  if (league === 'gold')   return Math.max(0, 50 - userKm);
  return 0;
}

function nextTierName(league) {
  if (league === 'bronze') return 'Silver';
  if (league === 'silver') return 'Gold';
  if (league === 'gold')   return 'Elite';
  return '';
}

// ── LEAGUE TAB SWITCHING ──────────────────────────────────────────────────────
export function initLeagues() {
  document.querySelectorAll('.league-tab').forEach(tab => {
    tab.addEventListener('click', async () => {
      const targetLeague = tab.dataset.league;
      // Load data for the selected league tab
      await loadLeagueData(targetLeague);
      // Temporarily override league for rendering
      const origLeague = state.gameProfile?.league;
      if (state.gameProfile) state.gameProfile.league = targetLeague;
      renderLeague();
      if (state.gameProfile && origLeague) state.gameProfile.league = origLeague;
    });
  });
}
