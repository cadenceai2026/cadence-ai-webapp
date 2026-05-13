/**
 * notifications.js — In-app notification engine: toasts, level-up modal, engagement checks.
 */
import { state } from './state.js';
import { qs, toast } from './utils.js';

// ── LEVEL-UP CELEBRATION ──────────────────────────────────────────────────────
export function showLevelUp(newLevel) {
  const modal = qs('#levelup-modal');
  if (!modal) return;

  const lvlEl = qs('#levelup-num');
  if (lvlEl) lvlEl.textContent = newLevel;

  modal.style.display = 'flex';
  spawnConfetti();
  toast(`🎉 Level Up! You are now Level ${newLevel}!`);

  // Auto-dismiss after 4s
  setTimeout(() => closeLevelUp(), 4000);
}

window.closeLevelUp = function() {
  const modal = qs('#levelup-modal');
  if (modal) {
    modal.classList.add('modal-exit');
    setTimeout(() => { modal.style.display = 'none'; modal.classList.remove('modal-exit'); }, 350);
  }
};

// ── CONFETTI ──────────────────────────────────────────────────────────────────
function spawnConfetti() {
  const colors  = ['#00E5A0', '#FFD700', '#FF6B35', '#9B59B6', '#4A90D9'];
  const root    = document.getElementById('toast-root') || document.body;
  for (let i = 0; i < 55; i++) {
    const dot = document.createElement('div');
    dot.className = 'confetti-dot';
    dot.style.cssText = `
      left: ${Math.random() * 100}vw;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      width: ${6 + Math.random() * 8}px;
      height: ${6 + Math.random() * 8}px;
      animation-delay: ${Math.random() * 0.6}s;
      animation-duration: ${1.2 + Math.random() * 0.8}s;`;
    document.body.appendChild(dot);
    setTimeout(() => dot.remove(), 2500);
  }
}

// ── BATTLE NOTIFICATIONS (checked periodically) ────────────────────────────────
let lastBattleCheck = 0;
export function checkBattleNotifications() {
  const now = Date.now();
  if (now - lastBattleCheck < 30000) return; // Check max every 30s
  lastBattleCheck = now;

  const battle = state.activeBattle;
  if (!battle || battle.status !== 'active') return;

  const youKm   = parseFloat(battle.challenger_km || 0);
  const rivKm   = parseFloat(battle.opponent_km   || 0);
  const diff    = Math.abs(youKm - rivKm).toFixed(1);
  const winning = youKm > rivKm;

  // 10% chance to show a notification each check to feel "real-time"
  if (Math.random() < 0.10) {
    if (winning) toast(`🏆 You're leading by ${diff} km — keep it up!`);
    else         toast(`⚠️ Rival is ${diff} km ahead — time to run!`);
  }
}

// ── STREAK REMINDER ────────────────────────────────────────────────────────────
export function checkStreakReminder() {
  const gp = state.gameProfile;
  if (!gp || !gp.last_run_date) return;

  const daysSince = (Date.now() - new Date(gp.last_run_date)) / 86400000;
  if (daysSince > 1.5 && gp.streak_days >= 2) {
    // Show once per session
    if (!sessionStorage.getItem('streak_warned')) {
      sessionStorage.setItem('streak_warned', '1');
      setTimeout(() => {
        toast(`🔥 Your ${gp.streak_days}-day streak is at risk! Log a run today.`, 'error');
      }, 8000);
    }
  }
}

// ── ENGAGEMENT LOOP (runs every 45s while app is open) ────────────────────────
let engagementInterval = null;
export function startEngagementLoop() {
  if (engagementInterval) return;
  // Initial checks after 10s
  setTimeout(() => {
    checkStreakReminder();
    checkBattleNotifications();
  }, 10000);

  engagementInterval = setInterval(() => {
    checkBattleNotifications();
  }, 45000);
}

// ── NOTIFICATION DOT (badge on nav) ───────────────────────────────────────────
export function setNavBadge(pageKey, count) {
  const btn = document.querySelector(`[data-page="${pageKey}"]`);
  if (!btn) return;
  let badge = btn.querySelector('.nav-badge');
  if (count <= 0) {
    badge?.remove();
    return;
  }
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'nav-badge';
    btn.appendChild(badge);
  }
  badge.textContent = count > 9 ? '9+' : count;
}

// ── INIT ──────────────────────────────────────────────────────────────────────
export function initNotifications() {
  startEngagementLoop();

  // Close reward modal on click
  qs('#reward-modal')?.addEventListener('click', (e) => {
    if (e.target === qs('#reward-modal')) qs('#reward-modal').style.display = 'none';
  });
}
