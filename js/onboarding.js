/**
 * onboarding.js — First-run animated overlay (<60s). Shows rival, first challenge, CTA.
 */
import { state } from './state.js';
import { qs } from './utils.js';
import { getMockRival, getMockChallenges, LEAGUES } from './game.js';

const STORAGE_KEY = 'cadence_onboarding_done';

export function checkFirstRun() {
  // If already done, skip
  if (localStorage.getItem(STORAGE_KEY)) return;
  // Show after short delay so app finishes loading
  setTimeout(showOnboarding, 600);
}

function showOnboarding() {
  const overlay = qs('#onboarding-overlay');
  if (!overlay) return;
  overlay.style.display = 'flex';
  overlay.classList.add('ob-visible');
  runSteps();
}

function runSteps() {
  const steps = [
    qs('#ob-step-1'),
    qs('#ob-step-2'),
    qs('#ob-step-3'),
    qs('#ob-step-4'),
  ];

  // Populate step 2 — rival
  const rival = getMockRival();
  const rivalEl = qs('#ob-rival-card');
  if (rivalEl) {
    rivalEl.innerHTML = `
      <div class="ob-rival-av">${rival.avatar_initial || 'A'}</div>
      <div>
        <div class="ob-rival-name">${rival.display_name}</div>
        <div class="ob-rival-stats">Level ${rival.level} · Silver League · ${rival.weekly_km} km/wk avg</div>
      </div>`;
  }

  // Populate step 3 — challenge
  const ch   = getMockChallenges()[2]; // weekly 20km challenge
  const chEl = qs('#ob-challenge-card');
  if (chEl && ch) {
    chEl.innerHTML = `
      <div class="ob-ch-icon">⚡</div>
      <div>
        <div class="ob-ch-title">${ch.title}</div>
        <div class="ob-ch-xp">+${ch.xp_reward} XP reward</div>
      </div>`;
  }

  // Populate user name in step 1
  const nameEl = qs('#ob-user-name');
  if (nameEl) {
    nameEl.textContent = state.profile?.display_name || 'Runner';
  }

  // Show steps sequentially
  let current = 0;
  const showStep = (i) => {
    steps.forEach((s, j) => {
      if (!s) return;
      s.classList.toggle('ob-step-active', j === i);
    });
  };
  showStep(0);

  // Auto-advance through steps 1-3
  const timings = [2000, 2500, 2500];
  timings.forEach((delay, idx) => {
    setTimeout(() => showStep(idx + 1), timings.slice(0, idx + 1).reduce((a, b) => a + b, 0));
  });
}

export function finishOnboarding() {
  localStorage.setItem(STORAGE_KEY, '1');
  const overlay = qs('#onboarding-overlay');
  if (!overlay) return;
  overlay.classList.remove('ob-visible');
  overlay.classList.add('ob-exit');
  setTimeout(() => overlay.style.display = 'none', 500);

  // Assign rival and first battle
  state.rival = getMockRival();
  import('./game.js').then(({ getMockBattle }) => {
    state.activeBattle = getMockBattle();
  });
}

window.finishOnboarding = finishOnboarding;
