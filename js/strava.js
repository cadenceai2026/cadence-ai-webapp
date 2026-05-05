import { supabase } from './supabase-client.js';
import { state } from './state.js';
import { qs, toast } from './utils.js';
import { updateAthleteUI, showAuthView } from './ui.js';
import { CONFIG } from './config.js';
import { renderDashboard } from './dashboard.js';
import { renderActivities } from './activities.js';

export async function initStrava() {
  qs('#btn-connect-strava')?.addEventListener('click', connectStrava);
  qs('#btn-reconnect-strava')?.addEventListener('click', connectStrava);
  qs('#btn-sync')?.addEventListener('click', syncActivities);

  // Check connection on load
  await checkStravaConnection();
}

export async function checkStravaConnection() {
  if (!state.user) return;

  const { data, error } = await supabase
    .from('strava_connections')
    .select('*')
    .eq('user_id', state.user.id)
    .maybeSingle();

  if (error) {
    console.error('checkStravaConnection:', error);
    return;
  }

  state.stravaConnection = data || null;

  if (state.stravaConnection) {
    updateAthleteUI(state.stravaConnection);
    await loadActivitiesFromDb();
  } else {
    // No strava connected — show connect prompt
    showAuthView('strava');
  }
}

function connectStrava() {
  const url =
    `https://www.strava.com/oauth/authorize` +
    `?client_id=${encodeURIComponent(CONFIG.strava.clientId)}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(CONFIG.strava.redirectUri)}` +
    `&approval_prompt=auto` +
    `&scope=${encodeURIComponent(CONFIG.strava.scope)}`;

  window.location.href = url;
}

export async function syncActivities() {
  if (!state.user) return;
  toast('Syncing with Strava…');

  const { error } = await supabase.functions.invoke('sync-strava-activities', {
    body: {}
  });

  if (error) {
    console.error('syncActivities:', error);
    toast('Failed to sync — check your Strava connection', 'error');
    return;
  }

  await loadActivitiesFromDb();
  toast('Synced ✓');
}

async function loadActivitiesFromDb() {
  if (!state.user) return;

  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('user_id', state.user.id)
    .order('start_date', { ascending: false })
    .limit(60);

  if (error) {
    console.error('loadActivitiesFromDb:', error);
    return;
  }

  state.activities = data || [];
  renderDashboard();
  renderActivities();
}
