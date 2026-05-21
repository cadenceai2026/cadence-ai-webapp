/**
 * onboarding.js — First-run animated overlay (<60s). Shows rival, first challenge, CTA.
 */
import { state } from './state.js';
import { qs } from './utils.js';
import { ensureBotRival } from './mockData.js';
import { supabase } from './supabase-client.js';

const STORAGE_KEY = 'cadence_onboarding_done';

export function checkFirstRun() {
  if (localStorage.getItem(STORAGE_KEY)) return;
  setTimeout(showOnboarding, 600);
}

async function showOnboarding() {
  const overlay = qs('#onboarding-overlay');
  if (!overlay) return;
  
  overlay.style.display = 'flex';
  overlay.classList.add('ob-visible');
  
  if (state.user) {
    // 1. Assign Rival (<60s guaranteed via bot)
    const battle = await ensureBotRival(state.user.id);
    
    // 2. Generate Easy Challenge
    await generateEasyChallenge(state.user.id);
    
    runSteps(battle);
  } else {
    runSteps(null);
  }
}

async function generateEasyChallenge(userId) {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
  await supabase.from('challenges').insert({
    user_id: userId,
    title: 'Cover 2 km today',
    target_km: 2,
    current_km: 0,
    xp_reward: 100,
    expires_at: expiresAt.toISOString(),
    status: 'active'
  });
}

function runSteps(battle) {
  const steps = [
    qs('#ob-step-1'),
    qs('#ob-step-2'),
    qs('#ob-step-3'),
    qs('#ob-step-4'),
  ];

  // Populate step 2 — rival
  const rivalEl = qs('#ob-rival-card');
  if (rivalEl && battle) {
    const oppName = battle._opponent_name || 'Your Rival';
    rivalEl.innerHTML = `
      <div class="ob-rival-av">${oppName[0].toUpperCase()}</div>
      <div>
        <div class="ob-rival-name">${oppName}</div>
        <div class="ob-rival-stats">Matched to your level. You can win this.</div>
      </div>
      <div style="margin-top:8px; width: 100%; height: 4px; background: #333; border-radius: 2px; overflow: hidden; display: flex;">
        <div style="width: 50%; background: var(--green);"></div>
        <div style="width: 50%; background: #FF3B30;"></div>
      </div>
      <div style="display:flex; justify-content:space-between; font-size:10px; color:#aaa; margin-top:4px;">
        <span>You (0 km)</span><span>Rival (0 km)</span>
      </div>`;
  }

  const chEl = qs('#ob-challenge-card');
  if (chEl) {
    chEl.innerHTML = `
      <div class="ob-ch-icon">⚡</div>
      <div>
        <div class="ob-ch-title">Cover 2 km today</div>
        <div class="ob-ch-xp">+100 XP reward (Easy)</div>
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
