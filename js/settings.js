import { supabase } from './supabase-client.js';
import { state } from './state.js';
import { qs, toast, daysUntil } from './utils.js';
import { updatePlanUI } from './ui.js';

export function initSettings() {
  qs('#btn-save-profile')?.addEventListener('click', saveProfile);
  qs('#btn-save-coach')?.addEventListener('click', saveCoachPrefs);
  qs('#btn-save-notifs')?.addEventListener('click', saveNotifications);
  qs('#btn-change-password')?.addEventListener('click', changePassword);
  qs('#btn-signout-settings')?.addEventListener('click', signOut);
  qs('#btn-delete-account')?.addEventListener('click', deleteAccount);
  qs('#btn-toggle-strava-refresh')?.addEventListener('click', () => {
    const wrap = qs('#strava-refresh-wrap');
    if (wrap) wrap.style.display = wrap.style.display === 'none' ? 'block' : 'none';
  });
  qs('#btn-update-token')?.addEventListener('click', updateStravaToken);
}

export function loadSettingsUI() {
  const p = state.profile;
  const sc = state.stravaConnection;
  if (!p) return;

  // Profile
  const nameEl = qs('#profile-name');
  const cityEl = qs('#profile-city');
  if (nameEl) nameEl.value = p.display_name || '';
  if (cityEl) cityEl.value = p.city || '';

  // Avatar
  const av = qs('#settings-avatar');
  if (av && sc?.athlete_profile) {
    av.innerHTML = `<img src="${sc.athlete_profile}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
  } else if (av) {
    av.textContent = (p.display_name || p.email || '?')[0].toUpperCase();
  }

  // Display name
  const dnEl = qs('#settings-display-name');
  if (dnEl) dnEl.textContent = p.display_name || p.email || '—';

  // Email
  const emailEl = qs('#settings-email');
  if (emailEl) emailEl.textContent = state.user?.email || '—';

  // Chips
  selectChipByVal('runner-type', p.runner_type);
  selectChipByVal('goal', p.goal);
  selectChipByVal('lang', p.coach_lang);
  selectChipByVal('style', p.coach_style);

  // Toggles
  setToggle('notif-weekly', p.notif_weekly);
  setToggle('notif-ranking', p.notif_ranking);
  setToggle('notif-inactive', p.notif_inactive);
  setToggle('notif-winner', p.notif_winner);

  // Strava status
  const dot = qs('#strava-status-dot');
  const txt = qs('#strava-status-txt');
  if (sc) {
    if (dot) dot.style.background = 'var(--green)';
    if (txt) txt.textContent = `Connected as ${sc.athlete_firstname} ${sc.athlete_lastname}`;
  } else {
    if (dot) dot.style.background = 'var(--muted)';
    if (txt) txt.textContent = 'Not connected';
  }

  // Subscription
  updateSubSection();
}

function updateSubSection() {
  const plan = state.profile?.plan || 'trial';
  const tag = qs('#sub-plan-tag');
  const detail = qs('#sub-plan-detail');
  const btn = qs('#sub-action-btn');

  if (tag) { tag.textContent = plan.toUpperCase(); tag.className = `plan-tag ${plan}`; }

  if (detail) {
    if (plan === 'elite') {
      detail.textContent = 'Full access · renews monthly';
    } else if (plan === 'trial') {
      const days = daysUntil(state.profile?.trial_ends_at);
      detail.textContent = `Free trial · ${days} days remaining`;
    } else {
      detail.textContent = 'Free plan · limited features';
    }
  }

  if (btn) {
    if (plan === 'elite') {
      btn.textContent = 'Manage subscription';
      btn.onclick = () => toast('To cancel, email support@cadenceapp.io');
    } else {
      btn.textContent = 'Upgrade to Elite →';
      btn.onclick = () => { import('./router.js').then(r => r.navigate('pricing')); };
    }
  }
}

async function saveProfile() {
  if (!state.user) return;

  const payload = {
    display_name: qs('#profile-name')?.value.trim(),
    city: qs('#profile-city')?.value.trim(),
    runner_type: getSelectedChip('runner-type'),
    goal: getSelectedChip('goal'),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', state.user.id)
    .select()
    .single();

  if (error) return toast(error.message, 'error');

  state.profile = data;
  const dnEl = qs('#settings-display-name');
  if (dnEl) dnEl.textContent = data.display_name || '—';
  updatePlanUI(state.profile);
  toast('Profile saved ✓');
}

async function saveCoachPrefs() {
  if (!state.user) return;

  const payload = {
    coach_lang: getSelectedChip('lang') || 'en',
    coach_style: getSelectedChip('style') || 'friendly',
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', state.user.id);

  if (error) return toast(error.message, 'error');
  if (state.profile) Object.assign(state.profile, payload);
  toast('Coach preferences saved ✓');
}

async function saveNotifications() {
  if (!state.user) return;

  const payload = {
    notif_weekly: getToggle('notif-weekly'),
    notif_ranking: getToggle('notif-ranking'),
    notif_inactive: getToggle('notif-inactive'),
    notif_winner: getToggle('notif-winner'),
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', state.user.id);

  if (error) return toast(error.message, 'error');
  if (state.profile) Object.assign(state.profile, payload);
  toast('Notifications saved ✓');
}

async function updateStravaToken() {
  const token = qs('#new-token-input')?.value.trim();
  if (!token) return toast('Paste a token first', 'error');

  const { error } = await supabase
    .from('strava_connections')
    .update({ access_token: token })
    .eq('user_id', state.user.id);

  if (error) return toast(error.message, 'error');

  if (state.stravaConnection) state.stravaConnection.access_token = token;
  qs('#new-token-input').value = '';
  qs('#strava-refresh-wrap').style.display = 'none';
  toast('Token updated ✓');
}

async function changePassword() {
  const { error } = await supabase.auth.resetPasswordForEmail(
    state.user.email,
    { redirectTo: window.location.href }
  );
  if (error) toast(error.message, 'error');
  else toast('Password reset link sent to your email ✓');
}

async function signOut() {
  await supabase.auth.signOut();
}

async function deleteAccount() {
  const ok = confirm('Are you sure? This cannot be undone.');
  if (!ok) return;
  const word = prompt('Type DELETE to confirm:');
  if (word !== 'DELETE') return;

  const { error } = await supabase.functions.invoke('delete-my-account', { body: {} });
  if (error) return toast(error.message, 'error');

  toast('Account deleted');
  setTimeout(() => location.reload(), 1500);
}

// ── Helpers ──
function selectChipByVal(group, val) {
  if (!val) return;
  document.querySelectorAll(`.settings-chip[data-group="${group}"]`)
    .forEach(c => c.classList.toggle('selected', c.dataset.val === val));
}

function getSelectedChip(group) {
  return document.querySelector(`.settings-chip[data-group="${group}"].selected`)?.dataset?.val || null;
}

function setToggle(id, val) {
  const el = qs(`#${id}`);
  if (el) el.checked = !!val;
}

function getToggle(id) {
  return qs(`#${id}`)?.checked || false;
}
