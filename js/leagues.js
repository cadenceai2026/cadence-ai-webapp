/**
 * leagues.js — Weekly league leaderboard with Bronze/Silver/Gold/Elite tiers.
 */
import { state } from './state.js';
import { qs } from './utils.js';
import { LEAGUES, getMockLeaderboard } from './game.js';

// ── LOAD ──────────────────────────────────────────────────────────────────────
async function loadLeagueData() {
  if (state.leaderboard.length) return;
  state.leaderboard = getMockLeaderboard();
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
  await loadLeagueData();

  const gp      = state.gameProfile;
  const league  = gp?.league || 'silver';
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
    const promoted  = board.filter((r, i) => i < 3);
    const demoted   = board.filter((r, i) => i >= board.length - 2);
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
    const isDemote = idx >= totalRows - 2;
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
    tab.addEventListener('click', () => {
      const targetLeague = tab.dataset.league;
      if (state.gameProfile) state.gameProfile.league = targetLeague;
      state.leaderboard = [];
      renderLeague();
    });
  });
}
