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
  qs('#btn-disconnect-strava')?.addEventListener('click', disconnectStrava);

  qs('#btn-skip-strava')?.addEventListener('click', () => {
    showAppScreen();
    navigate('dashboard');
  });
}

export async function checkStravaConnection() {
  if (!state.user) return;

  // Strip the ?strava=connected param added by the OAuth callback page.
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('strava') === 'connected') {
    window.history.replaceState({}, '', window.location.pathname);
  }

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
    }

    updateStravaSettingsUI();

    // Always go to the dashboard — never redirect back to the auth screen.
    showAppScreen();
    navigate('dashboard');

    if (state.stravaConnection) {
      loadActivitiesFromDb()
        .then(() => {
          if (state.activities.length === 0) {
            syncActivities();
          }
        })
        .catch(e => console.error('loadActivities error:', e));
    }
  } catch (e) {
    console.error('checkStravaConnection unexpected error:', e);
    showAppScreen();
    navigate('dashboard');
  }
}

function updateStravaSettingsUI() {
  const dot = qs('#strava-conn-dot');
  const status = qs('#strava-conn-status');
  const reconnectBtn = qs('#btn-reconnect-strava');
  const disconnectBtn = qs('#btn-disconnect-strava');

  if (state.stravaConnection) {
    const name = `${state.stravaConnection.athlete_firstname || ''} ${state.stravaConnection.athlete_lastname || ''}`.trim();
    if (dot) dot.style.background = '#00E5A0';
    if (status) status.textContent = name ? `Connected as ${name}` : 'Connected';
    if (reconnectBtn) reconnectBtn.style.display = 'none';
    if (disconnectBtn) disconnectBtn.style.display = '';
  } else {
    if (dot) dot.style.background = 'var(--muted)';
    if (status) status.textContent = 'Not connected';
    if (reconnectBtn) reconnectBtn.style.display = '';
    if (disconnectBtn) disconnectBtn.style.display = 'none';
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

async function disconnectStrava() {
  if (!state.user) return;
  if (!confirm('Disconnect Strava? Your synced activities will be removed.')) return;

  const { error } = await supabase
    .from('strava_connections')
    .delete()
    .eq('user_id', state.user.id);

  if (error) {
    toast('Failed to disconnect Strava', 'error');
    return;
  }

  await supabase.from('activities').delete().eq('user_id', state.user.id);

  state.stravaConnection = null;
  state.activities = [];
  updateAthleteUI({ athlete_firstname: '', athlete_lastname: '', athlete_profile: '' });
  updateStravaSettingsUI();
  renderDashboard();
  renderActivities();
  toast('Strava disconnected');
}

export async function syncActivities() {
  if (!state.user) return;
  toast('Syncing with Strava…');

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) { toast('Session expired — please sign in again', 'error'); return; }

  // Use plain fetch so we can always read the response body for debugging.
  let resp, body;
  try {
    resp = await fetch(`${CONFIG.supabaseUrl}/functions/v1/sync-strava-activities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': CONFIG.supabaseAnonKey,
      },
      body: JSON.stringify({}),
    });
    body = await resp.json();
  } catch (e) {
    toast(`Sync failed — network error: ${e}`, 'error');
    return;
  }

  if (!resp.ok) {
    console.error('syncActivities error body:', JSON.stringify(body));
    if (resp.status === 401) {
      toast('Strava token expired — please reconnect Strava', 'error');
    } else {
      const detail = body?.error || `HTTP ${resp.status}`;
      toast(`Sync failed — ${detail}`, 'error');
    }
    return;
  }

  await loadActivitiesFromDb();
  const count = body?.count ?? 0;
  toast(count > 0 ? `Synced ${count} activities ✓` : 'Synced ✓');
}

export async function loadActivitiesFromDb() {
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
