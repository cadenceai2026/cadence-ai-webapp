import { supabase } from './supabase-client.js';
import { state } from './state.js';
import { qs, toast } from './utils.js';
import { showAppScreen, updatePlanUI } from './ui.js';
import { navigate } from './router.js';
import { CONFIG } from './config.js';
import { checkStravaConnection } from './strava.js';

export async function initAuth() {
  // Buttons for app (sign out)
  qs('#btn-signout')?.addEventListener('click', signOut);

  // Listen for auth changes
  supabase.auth.onAuthStateChange(async (event, session) => {
    state.session = session;
    state.user = session?.user || null;

    if (event === 'SIGNED_IN' && state.user) {
      await loadProfile();
      await checkStravaConnection();
      // Check if coming from Stripe
      const params = new URLSearchParams(window.location.search);
      if (params.get('upgraded') === 'true') {
        await markElite();
        window.history.replaceState({}, '', window.location.pathname);
      }
    }

    if (event === 'SIGNED_OUT') {
      state.user = null;
      state.profile = null;
      state.stravaConnection = null;
      state.activities = [];
      window.location.replace('./login.html');
    }
  });

  // Check existing session on load
  const { data, error } = await supabase.auth.getSession();
  const session = data?.session || null;
  state.session = session;
  state.user = session?.user || null;

  if (state.user) {
    await loadProfile();
    await checkStravaConnection();
    // Check Stripe redirect
    const params = new URLSearchParams(window.location.search);
    if (params.get('upgraded') === 'true') {
      await markElite();
      window.history.replaceState({}, '', window.location.pathname);
    }
  } else {
    window.location.replace('./login.html');
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
