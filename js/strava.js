import { supabase } from './supabase-client.js';
import { state } from './state.js';
import { qs, toast } from './utils.js';
import { updateAthleteUI, showAppScreen } from './ui.js';
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

let stravaCheckRunning = false;

export async function checkStravaConnection() {
  if (!state.user) return;
  if (stravaCheckRunning) return;
  stravaCheckRunning = true;

  // Strip the ?strava=connected param added by the OAuth callback page.
  const urlParams = new URLSearchParams(window.location.search);
  const isNewConnection = urlParams.get('strava') === 'connected';
  if (isNewConnection) {
    window.history.replaceState({}, '', window.location.pathname);
  }

  try {
    const { data, error } = await supabase
      .from('strava_connections')
      .select('*')
      .eq('user_id', state.user.id)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('checkStravaConnection:', error);
      showAppScreen();
      navigate('dashboard');
      renderDashboard();
      renderActivities();
      return;
    }

    state.stravaConnection = data || null;

    if (state.stravaConnection) {
      // Prefer the user's custom uploaded avatar over Strava photo
      const displayConn = state.profile?.avatar_url
        ? { ...state.stravaConnection, athlete_profile: state.profile.avatar_url }
        : state.stravaConnection;
      updateAthleteUI(displayConn);
    }

    updateStravaSettingsUI();

    // Always show the dashboard
    showAppScreen();
    navigate('dashboard');

    if (state.stravaConnection) {
      loadActivitiesFromDb()
        .then(() => {
          if (state.activities.length === 0 || isNewConnection) {
            syncActivities();
          }
        })
        .catch(e => console.error('loadActivities error:', e));
    } else {
      renderDashboard();
      renderActivities();
    }
  } catch (e) {
    console.error('checkStravaConnection unexpected error:', e);
    showAppScreen();
    navigate('dashboard');
    renderDashboard();
    renderActivities();
  } finally {
    stravaCheckRunning = false;
  }
}

function updateStravaSettingsUI() {
  const dot           = qs('#strava-conn-dot');
  const statusTxt     = qs('#strava-conn-status');
  const reconnectBtn  = qs('#btn-reconnect-strava');
  const disconnectBtn = qs('#btn-disconnect-strava');
  const sc = state.stravaConnection;

  if (sc) {
    const name = [sc.athlete_firstname, sc.athlete_lastname].filter(Boolean).join(' ');
    if (dot)           dot.style.background       = 'var(--green)';
    if (statusTxt)     statusTxt.textContent       = name ? `Connected as ${name}` : 'Connected ✓';
    if (reconnectBtn)  reconnectBtn.style.display  = 'none';
    if (disconnectBtn) disconnectBtn.style.display = '';
  } else {
    if (dot)           dot.style.background       = 'var(--muted)';
    if (statusTxt)     statusTxt.textContent       = 'Not connected';
    if (reconnectBtn)  reconnectBtn.style.display  = '';
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

  // Keep showing the user's name but clear the Strava photo (custom avatar stays)
  updateAthleteUI({
    athlete_firstname: state.profile?.display_name || '',
    athlete_lastname:  '',
    athlete_profile:   state.profile?.avatar_url || ''
  });
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
