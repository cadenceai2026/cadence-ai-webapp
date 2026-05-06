import { supabase } from './supabase-client.js';
import { state } from './state.js';
import { qs, toast } from './utils.js';
import { updateAthleteUI, showAuthView, showAuthScreen, showAppScreen } from './ui.js';
import { navigate } from './router.js';
import { CONFIG } from './config.js';
import { renderDashboard } from './dashboard.js';
import { renderActivities } from './activities.js';

export async function initStrava() {
  qs('#btn-connect-strava')?.addEventListener('click', connectStrava);
  qs('#btn-reconnect-strava')?.addEventListener('click', connectStrava);
  qs('#btn-sync')?.addEventListener('click', syncActivities);

  qs('#btn-skip-strava')?.addEventListener('click', () => {
    showAppScreen();
    navigate('dashboard');
  });
}

export async function checkStravaConnection() {
  if (!state.user) return;

  try {
    const { data, error } = await supabase
      .from('strava_connections')
      .select('*')
      .eq('user_id', state.user.id)
      .maybeSingle();

    if (error) {
      console.error('checkStravaConnection:', error);
      showAppScreen();
      navigate('dashboard');
      return;
    }

    state.stravaConnection = data || null;

    if (state.stravaConnection) {
      updateAthleteUI(state.stravaConnection);
      showAppScreen();
      navigate('dashboard');
      loadActivitiesFromDb()
        .then(() => {
          if (state.activities.length === 0) {
            syncActivities();
          }
        })
        .catch(e => console.error('loadActivities error:', e));
    } else {
      const justCreated = state.profile?.created_at &&
        (Date.now() - new Date(state.profile.created_at).getTime()) < 3600000;
      if (justCreated) {
        showAuthScreen();
        showAuthView('strava');
      } else {
        showAppScreen();
        navigate('dashboard');
      }
    }
  } catch (e) {
    console.error('checkStravaConnection unexpected error:', e);
    showAppScreen();
    navigate('dashboard');
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

  const { data: { session } } = await supabase.auth.getSession();
  const { error } = await supabase.functions.invoke('sync-strava-activities', {
    body: {},
    headers: { Authorization: `Bearer ${session?.access_token}` }
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
