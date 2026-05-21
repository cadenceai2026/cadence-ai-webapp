/**
 * leagues.js — Weekly league leaderboard from real DB data.
 */
import { supabase } from './supabase-client.js';
import { state } from './state.js';
import { qs } from './utils.js';
import { LEAGUES } from './game.js';

// ── LOAD REAL LEADERBOARD ─────────────────────────────────────────────────────
async function loadLeagueData(forceLeague, forceCity = false) {
  if (!state.user) {
    state.leaderboard = [];
    return;
  }

  const league = forceLeague || state.gameProfile?.league || 'bronze';

  try {
    const { data, error } = await supabase
      .from('game_profiles')
      .select('user_id, level, weekly_km, total_xp')
      .eq('league', league)
      .order('weekly_km', { ascending: false })
      .limit(200); // Fetch more so we can filter by city

    if (error || !data || data.length === 0) {
      state.leaderboard = buildSoloLeaderboard(league);
      return;
    }

    const userIds = data.map(d => d.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, city')
      .in('id', userIds);

    const profileMap = {};
    (profiles || []).forEach(p => { profileMap[p.id] = p; });

    let mapped = data.map((row) => ({
      user_id: row.user_id,
      name: profileMap[row.user_id]?.display_name || 'Runner',
      city: profileMap[row.user_id]?.city || '',
      km: parseFloat(row.weekly_km) || 0,
      level: row.level || 1,
      isUser: row.user_id === state.user.id,
      avatar: (profileMap[row.user_id]?.display_name || 'R')[0]?.toUpperCase() || 'R',
    }));

    if (forceCity) {
      const myCity = state.profile?.city;
      if (myCity) {
        mapped = mapped.filter(r => r.city.toLowerCase() === myCity.toLowerCase() || r.isUser);
      }
    }

    mapped = mapped.slice(0, 20); // Top 20

    if (!mapped.some(r => r.isUser)) {
      const gp = state.gameProfile || {};
      mapped.push({
        user_id: state.user.id,
        name: state.profile?.display_name || 'You',
        city: state.profile?.city || '',
        km: parseFloat(gp.weekly_km) || 0,
        level: gp.level || 1,
        isUser: true,
        avatar: (state.profile?.display_name || 'Y')[0]?.toUpperCase() || 'Y',
      });
      mapped.sort((a, b) => b.km - a.km);
    }
    
    mapped.forEach((r, i) => r.rank = i + 1);
    state.leaderboard = mapped;

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
let isLocalCityMode = false;

export function initLeagues() {
  document.querySelectorAll('.league-tab').forEach(tab => {
    tab.addEventListener('click', async () => {
      const targetLeague = tab.dataset.league;
      await loadLeagueData(targetLeague, isLocalCityMode);
      
      const origLeague = state.gameProfile?.league;
      if (state.gameProfile) state.gameProfile.league = targetLeague;
      renderLeague();
      if (state.gameProfile && origLeague) state.gameProfile.league = origLeague;
    });
  });

  const btnGlobal = qs('#league-filter-global');
  const btnLocal = qs('#league-filter-local');
  
  if (btnGlobal && btnLocal) {
    btnGlobal.addEventListener('click', async () => {
      isLocalCityMode = false;
      btnGlobal.style.background = 'var(--green)';
      btnGlobal.style.color = '#000';
      btnLocal.style.background = 'var(--surface3)';
      btnLocal.style.color = 'var(--text)';
      
      const activeTab = document.querySelector('.league-tab.active');
      const targetLeague = activeTab ? activeTab.dataset.league : 'bronze';
      await loadLeagueData(targetLeague, isLocalCityMode);
      renderLeague();
    });

    btnLocal.addEventListener('click', async () => {
      if (!state.profile?.city) {
        window.toast('Please set your city in Settings first', 'error');
        return;
      }
      isLocalCityMode = true;
      btnLocal.style.background = 'var(--green)';
      btnLocal.style.color = '#000';
      btnGlobal.style.background = 'var(--surface3)';
      btnGlobal.style.color = 'var(--text)';
      
      const activeTab = document.querySelector('.league-tab.active');
      const targetLeague = activeTab ? activeTab.dataset.league : 'bronze';
      await loadLeagueData(targetLeague, isLocalCityMode);
      renderLeague();
    });
  }
}
