/**
 * onboarding.js — First-run animated overlay (<60s). Shows rival, first challenge, CTA.
 */
import { state } from './state.js';
import { qs } from './utils.js';
import { LEAGUES } from './game.js';

const STORAGE_KEY = 'cadence_onboarding_done';

import { supabase } from './supabase-client.js';

export function checkFirstRun() {
  if (localStorage.getItem(STORAGE_KEY)) return;
  setTimeout(showOnboarding, 600);
}

async function showOnboarding() {
  const overlay = qs('#onboarding-overlay');
  if (!overlay) return;
  overlay.style.display = 'flex';
  overlay.classList.add('ob-visible');
  
  // Call edge function in background
  let obData = null;
  try {
    const { data, error } = await supabase.functions.invoke('gamification-onboarding', {});
    if (!error && data) obData = data;
  } catch (err) {
    console.error('Onboarding provisioning failed:', err);
  }
  
  runSteps(obData);
}

function runSteps(obData) {
  const steps = [
    qs('#ob-step-1'),
    qs('#ob-step-2'),
    qs('#ob-step-3'),
    qs('#ob-step-4'),
  ];

  const rivalName = obData?.rival?.display_name || 'Your first rival';
  const rivalInitial = rivalName[0].toUpperCase();
  const chTitle = obData?.challenge?.title || 'Cover 20 km this week';
  const chXp = obData?.challenge?.xp_reward || 150;

  const rivalEl = qs('#ob-rival-card');
  if (rivalEl) {
    rivalEl.innerHTML = `
      <div class="ob-rival-av">${rivalInitial}</div>
      <div>
        <div class="ob-rival-name">${rivalName}</div>
        <div class="ob-rival-stats">Matched perfectly to your level</div>
      </div>`;
  }

  const chEl = qs('#ob-challenge-card');
  if (chEl) {
    chEl.innerHTML = `
      <div class="ob-ch-icon">⚡</div>
      <div>
        <div class="ob-ch-title">${chTitle}</div>
        <div class="ob-ch-xp">+${chXp} XP reward</div>
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
}

window.finishOnboarding = finishOnboarding;
