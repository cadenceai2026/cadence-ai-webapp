import { initAuth } from './auth.js';
import { initRouter, navigate } from './router.js';
import { initStrava } from './strava.js';
import { initBilling } from './billing.js';
import { initSettings } from './settings.js';
import { initGroups } from './groups.js';
import { initCoach } from './coach.js';
import { initActivities } from './activities.js';
import { initGame } from './game.js';
import { initBattles } from './battles.js';
import { initBattlePass } from './battlepass.js';
import { initChallenges } from './challenges.js';
import { initLeagues } from './leagues.js';
import { initNotifications } from './notifications.js';

// ── ERROR BOUNDARIES & OFFLINE ──
window.addEventListener('online',  updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

function updateOnlineStatus() {
  const banner = document.querySelector('#offline-banner');
  if (banner) {
    banner.style.display = navigator.onLine ? 'none' : 'block';
  }
}

window.onerror = function(msg, url, lineNo, columnNo, error) {
  console.error('Global error:', msg, error);
  const modal = document.querySelector('#error-boundary-modal');
  if (modal) modal.style.display = 'flex';
  return false; 
};

// ── ONBOARDING ──
function checkOnboarding() {
  if (!localStorage.getItem('cadence_onboarded')) {
    const modal = document.querySelector('#onboarding-modal');
    const btn = document.querySelector('#btn-close-onboarding');
    if (modal && btn) {
      modal.style.display = 'flex';
      btn.addEventListener('click', () => {
        modal.style.display = 'none';
        localStorage.setItem('cadence_onboarded', '1');
      });
    }
  }
}

async function boot() {
  updateOnlineStatus();
  checkOnboarding();
  initRouter();
  initStrava();
  initBilling();
  initSettings();
  initGroups();
  initCoach();
  initActivities();

  // ── Game modules ──
  initBattles();
  initBattlePass();
  initChallenges();
  initLeagues();
  initNotifications();

  // Wire dashboard quick-action cards and "View all →" buttons
  document.querySelectorAll('[data-goto]').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.goto));
  });

  // Wire topbar "Ask AI Coach" button
  document.querySelector('#btn-ask-coach')?.addEventListener('click', () => navigate('coach'));

  // Wire elite welcome modal close button
  document.querySelector('#btn-close-elite')?.addEventListener('click', () => {
    document.querySelector('#elite-modal').style.display = 'none';
  });

  // Auth last — it controls what screen shows
  await initAuth();

  // Init game after auth (so we have user context)
  await initGame();

  // Expose navigate globally for inline onclick handlers
  window.navigate = navigate;
}

boot().catch(err => {
  console.error('Fatal boot error:', err);
  window.location.replace('./login.html');
});
