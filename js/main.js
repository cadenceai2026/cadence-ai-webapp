import { initAuth } from './auth.js';
import { initRouter, navigate } from './router.js';
import { initStrava } from './strava.js';
import { initBilling } from './billing.js';
import { initSettings } from './settings.js';
import { initGroups } from './groups.js';
import { initCoach } from './coach.js';
import { initActivities } from './activities.js';

async function boot() {
  // Init all modules
  initRouter();
  initStrava();
  initBilling();
  initSettings();
  initGroups();
  initCoach();
  initActivities();

  // Auth last — it controls what screen shows
  await initAuth();
}

boot();
