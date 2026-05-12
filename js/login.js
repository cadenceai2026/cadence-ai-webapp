import { supabase } from './supabase-client.js';
import { qs, toast } from './utils.js';

async function bootLogin() {
  // Check if already logged in
  const { data, error } = await supabase.auth.getSession();
  if (data?.session?.user) {
    window.location.replace('./app.html');
    return;
  }

  // Hide loading screen since we know we are unauthenticated
  const loading = qs('#screen-loading');
  if (loading) loading.style.display = 'none';
  const auth = qs('#screen-auth');
  if (auth) auth.style.display = 'flex';

  // Parse view from URL
  const params = new URLSearchParams(window.location.search);
  const view = params.get('view') === 'signup' ? 'signup' : 'signin';
  showAuthView(view);

  // Wire buttons
  qs('#btn-google-signin')?.addEventListener('click', signInWithGoogle);
  qs('#btn-google-signup')?.addEventListener('click', signInWithGoogle);
  qs('#form-signin')?.addEventListener('submit', signInWithEmail);
  qs('#form-signup')?.addEventListener('submit', signUpWithEmail);
  qs('#link-to-signup')?.addEventListener('click', (e) => { e.preventDefault(); showAuthView('signup'); });
  qs('#link-to-signin')?.addEventListener('click', (e) => { e.preventDefault(); showAuthView('signin'); });
  qs('#link-forgot')?.addEventListener('click', (e) => { e.preventDefault(); forgotPassword(); });
  qs('#btn-back-to-signin')?.addEventListener('click', () => showAuthView('signin'));

  // Listen for auth changes
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      window.location.replace('./app.html');
    }
  });
}

function showAuthView(name) {
  ['signin', 'signup', 'check-email'].forEach(v => {
    const el = qs(`#view-${v}`);
    if (el) el.style.display = v === name ? 'block' : 'none';
  });
}

async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + '/app.html' }
  });
  if (error) toast(error.message, 'error');
}

async function signInWithEmail(e) {
  if (e) e.preventDefault();
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
    btn.textContent = 'Sign in →';
  }
  // If success, onAuthStateChange will handle redirect
}

async function signUpWithEmail(e) {
  if (e) e.preventDefault();
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
    options: { emailRedirectTo: window.location.origin + '/app.html' }
  });

  if (error) {
    toast(error.message, 'error');
    btn.disabled = false;
    btn.textContent = 'Create account →';
  } else {
    showAuthView('check-email');
  }
}

async function forgotPassword() {
  const email = prompt('Enter your email:');
  if (!email) return;
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/app.html'
  });
  if (error) toast(error.message, 'error');
  else toast('Reset link sent! Check your email ✓');
}

bootLogin().catch(console.error);
