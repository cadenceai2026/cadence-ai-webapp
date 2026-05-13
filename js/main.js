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

async function boot() {
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
