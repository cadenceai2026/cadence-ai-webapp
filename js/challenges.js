/**
 * challenges.js — Daily & weekly auto-generated challenges with progress bars.
 */
import { state } from './state.js';
import { qs, toast } from './utils.js';
import { getMockChallenges, awardXP } from './game.js';

// ── LOAD CHALLENGES ───────────────────────────────────────────────────────────
async function loadChallengeData() {
  if (state.challenges.length) return;
  state.challenges = getMockChallenges();
}

// ── PROGRESS CALCULATION ──────────────────────────────────────────────────────
function getProgress(ch) {
  const target = ch.target_km || ch.target_count || ch.target_days || 1;
  const pct    = Math.min(100, (ch.current_value / target) * 100);
  return { target, pct };
}

function formatValue(ch) {
  if (ch.target_km)    return `${parseFloat(ch.current_value).toFixed(1)} / ${ch.target_km} km`;
  if (ch.target_count) return `${ch.current_value} / ${ch.target_count} runs`;
  if (ch.target_days)  return `${ch.current_value} / ${ch.target_days} days`;
  return ch.current_value;
}

function timeUntil(dateStr) {
  const diff = new Date(dateStr) - Date.now();
  if (diff <= 0) return 'Expired';
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h left`;
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m left`;
}

// ── RENDER ────────────────────────────────────────────────────────────────────
export async function renderChallenges() {
  await loadChallengeData();

  const daily   = state.challenges.filter(c => c.type === 'daily');
  const weekly  = state.challenges.filter(c => c.type === 'weekly');

  renderChallengeSection('#challenges-daily', daily, 'DAILY');
  renderChallengeSection('#challenges-weekly', weekly, 'WEEKLY');
}

function renderChallengeSection(selector, list, label) {
  const el = qs(selector);
  if (!el) return;

  if (!list.length) {
    el.innerHTML = `<div class="empty" style="padding:16px 0">No ${label.toLowerCase()} challenges active.</div>`;
    return;
  }

  el.innerHTML = list.map((ch, i) => {
    const { target, pct } = getProgress(ch);
    const done  = ch.completed;
    const value = formatValue(ch);
    const time  = timeUntil(ch.expires_at);

    return `
      <div class="challenge-card ${done ? 'challenge-done' : ''}" id="ch-card-${ch.id}">
        <div class="challenge-top">
          <div class="challenge-meta-row">
            <span class="challenge-type-badge ${ch.type}">${label}</span>
            <span class="challenge-timer">${done ? '✅ Complete' : time}</span>
          </div>
          <div class="challenge-title">${ch.title}</div>
        </div>
        <div class="challenge-progress-wrap">
          <div class="challenge-bar-bg">
            <div class="challenge-bar-fill" id="ch-fill-${ch.id}" 
                 style="width:0%;background:${done ? 'var(--green)' : pct >= 80 ? '#f59e0b' : 'var(--green)'}">
            </div>
          </div>
          <div class="challenge-progress-labels">
            <span class="challenge-value">${value}</span>
            <span class="challenge-xp">+${ch.xp_reward} XP</span>
          </div>
        </div>
        ${done ? '' : `
          <button class="challenge-claim-btn" onclick="claimChallenge('${ch.id}')">
            ${pct >= 100 ? '🎉 Claim Reward' : `${Math.round(pct)}% complete`}
          </button>`}
      </div>`;
  }).join('');

  // Animate progress bars
  requestAnimationFrame(() => {
    setTimeout(() => {
      list.forEach(ch => {
        const fill = qs(`#ch-fill-${ch.id}`);
        if (fill) fill.style.width = `${Math.min(100, getProgress(ch).pct)}%`;
      });
    }, 120);
  });
}

// ── CLAIM CHALLENGE ───────────────────────────────────────────────────────────
window.claimChallenge = function(id) {
  const ch = state.challenges.find(c => c.id === id);
  if (!ch) return;
  const { pct } = getProgress(ch);
  if (pct < 100) { toast('Keep running — not done yet! 🏃', 'error'); return; }
  if (ch.completed) { toast('Already claimed!'); return; }

  ch.completed    = true;
  ch.completed_at = new Date().toISOString();
  awardXP(ch.xp_reward, ch.title);
  toast(`🎉 Challenge complete! +${ch.xp_reward} XP`);

  // Refresh UI
  const card = qs(`#ch-card-${id}`);
  if (card) {
    card.classList.add('challenge-done');
    const btn = card.querySelector('.challenge-claim-btn');
    if (btn) btn.outerHTML = '<div class="challenge-claimed">✅ Claimed</div>';
  }
};

// ── UPDATE CHALLENGE PROGRESS (called after activity sync) ────────────────────
export function updateChallengeProgress() {
  const weeklyKm = import('./game.js').then(({ getWeeklyKmFromActivities }) => {
    const km = getWeeklyKmFromActivities();
    state.challenges.forEach(ch => {
      if (ch.completed) return;
      if (ch.target_km && ch.type === 'weekly') {
        ch.current_value = Math.min(ch.target_km, km);
      }
    });
    renderChallenges();
  });
}

// ── INIT ──────────────────────────────────────────────────────────────────────
export function initChallenges() {
  // Challenges auto-refresh every 60s during the session
  setInterval(() => {
    if (state.currentPage === 'challenges') renderChallenges();
  }, 60000);
}
