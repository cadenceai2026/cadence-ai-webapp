import { supabase } from './supabase-client.js';
import { state } from './state.js';
import { qs, toast } from './utils.js';
import { showAppScreen, updatePlanUI } from './ui.js';
import { navigate } from './router.js';
import { CONFIG } from './config.js';
import { checkStravaConnection } from './strava.js';

export async function initAuth() {
  // Sign out button
  qs('#btn-signout')?.addEventListener('click', signOut);

  // Listen ONLY for future auth events (sign out, token refresh).
  // We deliberately do NOT handle SIGNED_IN here to avoid double-running
  // checkStravaConnection alongside the getSession() call below.
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_OUT') {
      state.user = null;
      state.profile = null;
      state.stravaConnection = null;
      state.activities = [];
      window.location.replace('./login.html');
    }

    // TOKEN_REFRESHED: update state but don't re-run the full boot sequence
    if (event === 'TOKEN_REFRESHED' && session) {
      state.session = session;
      state.user = session.user;
    }
  });

  // --- Initial session check (runs once on load) ---
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error('getSession error:', error);
    window.location.replace('./login.html');
    return;
  }

  const session = data?.session || null;
  state.session = session;
  state.user = session?.user || null;

  if (!state.user) {
    window.location.replace('./login.html');
    return;
  }

  // User is authenticated — boot the dashboard
  await loadProfile();
  await checkStravaConnection();

  // Handle Stripe redirect
  const params = new URLSearchParams(window.location.search);
  if (params.get('upgraded') === 'true') {
    await markElite();
    window.history.replaceState({}, '', window.location.pathname);
  }
}

async function signOut() {
  await supabase.auth.signOut();
  toast('Signed out');
}

export async function loadProfile() {
  if (!state.user) return;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', state.user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('loadProfile error:', error);
    return;
  }

  if (data) {
    state.profile = data;
  } else {
    // Fallback: create manually if trigger didn't fire
    const { data: created } = await supabase
      .from('profiles')
      .insert({
        id: state.user.id,
        email: state.user.email,
        display_name: state.user.email?.split('@')[0] || 'Runner',
        plan: 'trial',
        trial_ends_at: new Date(Date.now() + 14 * 86400000).toISOString()
      })
      .select()
      .single();
    state.profile = created;
  }

  updatePlanUI(state.profile);

  // Show admin nav and settings section if admin
  if (state.user.email === CONFIG.adminEmail) {
    qs('#admin-nav-item')?.style.setProperty('display', 'flex');
    qs('#admin-section')?.style.setProperty('display', 'block');
  }
}

async function markElite() {
  if (!state.user) return;
  await supabase
    .from('profiles')
    .update({ plan: 'elite' })
    .eq('id', state.user.id);
  if (state.profile) state.profile.plan = 'elite';
  updatePlanUI(state.profile);
  const { showEliteWelcome } = await import('./ui.js');
  showEliteWelcome();
}
