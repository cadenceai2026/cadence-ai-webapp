import { initAuth } from './auth.js';
import { initRouter, navigate } from './router.js';
import { initStrava } from './strava.js';
import { initBilling } from './billing.js';
import { initSettings } from './settings.js';
import { initGroups } from './groups.js';
import { initCoach } from './coach.js';
import { initActivities } from './activities.js';

async function boot() {
  initRouter();
  initStrava();
  initBilling();
  initSettings();
  initGroups();
  initCoach();
  initActivities();

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

  // Auth last — it controls what screen shows and calls checkStravaConnection
  await initAuth();
}

boot().catch(err => {
  console.error('Fatal boot error:', err);
  const loading = document.querySelector('#screen-loading');
  if (loading) loading.style.display = 'none';
  const auth = document.querySelector('#screen-auth');
  if (auth) auth.style.display = 'flex';
});

setTimeout(() => {
  const loading = document.querySelector('#screen-loading');
  if (loading && loading.style.display !== 'none') {
    console.warn('Boot timeout - forcing auth screen');
    loading.style.display = 'none';
    const app = document.querySelector('#screen-app');
    const auth = document.querySelector('#screen-auth');
    if (auth && app && window.getComputedStyle(app).display === 'none') {
      auth.style.display = 'flex';
    }
  }
}, 4000);
