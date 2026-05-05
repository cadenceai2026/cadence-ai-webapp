import { supabase } from './supabase-client.js';
import { state } from './state.js';
import { qs, toast } from './utils.js';
import { showAuthScreen, showAppScreen, showAuthView, updatePlanUI } from './ui.js';
import { navigate } from './router.js';
import { CONFIG } from './config.js';

export async function initAuth() {
  // Buttons
  qs('#btn-google-signin')?.addEventListener('click', signInWithGoogle);
  qs('#btn-google-signup')?.addEventListener('click', signInWithGoogle);
  qs('#btn-signin')?.addEventListener('click', signInWithEmail);
  qs('#btn-signup')?.addEventListener('click', signUpWithEmail);
  qs('#btn-signout')?.addEventListener('click', signOut);
  qs('#link-signup')?.addEventListener('click', (e) => { e.preventDefault(); showAuthView('signup'); });
  qs('#link-signin')?.addEventListener('click', (e) => { e.preventDefault(); showAuthView('signin'); });
  qs('#link-forgot')?.addEventListener('click', (e) => { e.preventDefault(); forgotPassword(); });

  // Listen for auth changes
  supabase.auth.onAuthStateChange(async (event, session) => {
    state.session = session;
    state.user = session?.user || null;

    if (event === 'SIGNED_IN' && state.user) {
      await loadProfile();
      showAppScreen();
      navigate('dashboard');
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
      showAuthScreen();
    }
  });

  // Check existing session on load
  const { data: { session } } = await supabase.auth.getSession();
  state.session = session;
  state.user = session?.user || null;

  if (state.user) {
    await loadProfile();
    showAppScreen();
    navigate('dashboard');
    // Check Stripe redirect
    const params = new URLSearchParams(window.location.search);
    if (params.get('upgraded') === 'true') {
      await markElite();
      window.history.replaceState({}, '', window.location.pathname);
    }
  } else {
    showAuthScreen();
    showAuthView('signin');
  }
}

async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.href }
  });
  if (error) toast(error.message, 'error');
}

async function signInWithEmail() {
  const email = qs('#si-email')?.value.trim();
  const password = qs('#si-pass')?.value;
  if (!email || !password) return toast('Fill in email and password', 'error');

  const btn = qs('#btn-signin');
  btn.disabled = true;
  btn.textContent = 'Signing in…';

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    toast(error.message, 'error');
    btn.disabled = false;
    btn.textContent = 'Sign in';
  }
}

async function signUpWithEmail() {
  const email = qs('#su-email')?.value.trim();
  const password = qs('#su-pass')?.value;
  if (!email || !password) return toast('Fill in email and password', 'error');
  if (password.length < 6) return toast('Password must be at least 6 characters', 'error');

  const btn = qs('#btn-signup');
  btn.disabled = true;
  btn.textContent = 'Creating account…';

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: window.location.href }
  });

  if (error) {
    toast(error.message, 'error');
    btn.disabled = false;
    btn.textContent = 'Create account';
  } else {
    showAuthView('check-email');
  }
}

async function signOut() {
  await supabase.auth.signOut();
  toast('Signed out');
}

async function forgotPassword() {
  const email = prompt('Enter your email:');
  if (!email) return;
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.href
  });
  if (error) toast(error.message, 'error');
  else toast('Reset link sent! Check your email ✓');
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

  // Show admin nav if admin
  if (state.user.email === CONFIG.adminEmail) {
    qs('#admin-nav')?.style.setProperty('display', 'flex');
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
