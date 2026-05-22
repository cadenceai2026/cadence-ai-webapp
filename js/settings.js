import { supabase } from './supabase-client.js';
import { state } from './state.js';
import { qs, toast, daysUntil } from './utils.js';
import { updatePlanUI, updateAthleteUI } from './ui.js';

export function initSettings() {
  qs('#btn-save-profile')?.addEventListener('click', saveProfile);
  qs('#btn-save-coach')?.addEventListener('click', saveCoachPrefs);
  qs('#btn-save-notifs')?.addEventListener('click', saveNotifications);
  qs('#btn-change-pass')?.addEventListener('click', changePassword);
  qs('#btn-delete')?.addEventListener('click', deleteAccount);

  // Sign out — unified here, auth.js also wires it but this is the canonical handler
  qs('#btn-signout')?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('cadence_onboarded');
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach(name => caches.delete(name));
      });
    }
    window.location.href = './login.html';
  });

  // Avatar upload
  qs('#btn-upload-avatar')?.addEventListener('click', () => qs('#avatar-file-input')?.click());
  qs('#avatar-file-input')?.addEventListener('change', handleAvatarChange);

  qs('#btn-toggle-strava-refresh')?.addEventListener('click', () => {
    const wrap = qs('#strava-refresh-wrap');
    if (wrap) wrap.style.display = wrap.style.display === 'none' ? 'block' : 'none';
  });
  qs('#btn-update-token')?.addEventListener('click', updateStravaToken);

  // Auto-sync toggle
  qs('#autosync-toggle')?.addEventListener('change', async (e) => {
    const { toggleAutoSync } = await import('./strava.js');
    toggleAutoSync(e.target.checked);
  });

  // Chip selection (supports both .chip and .m3-chip)
  document.querySelectorAll('.m3-chip[data-group], .chip[data-group]').forEach(chip => {
    chip.addEventListener('click', () => {
      const group = chip.dataset.group;
      document.querySelectorAll(`.m3-chip[data-group="${group}"], .chip[data-group="${group}"]`)
        .forEach(c => c.classList.remove('on'));
      chip.classList.add('on');
    });
  });
}

export function loadSettingsUI() {
  const p  = state.profile;
  const sc = state.stravaConnection;
  if (!p) return;

  // Profile fields
  const nameEl = qs('#profile-name');
  const cityEl = qs('#profile-city');
  const bioEl  = qs('#profile-bio');
  const dobEl  = qs('#profile-dob');
  const wtEl   = qs('#profile-weight');
  if (nameEl) nameEl.value = p.display_name || '';
  if (cityEl) cityEl.value = p.city || '';
  if (bioEl)  bioEl.value  = p.bio  || '';
  if (dobEl)  dobEl.value  = p.date_of_birth || '';
  if (wtEl)   wtEl.value   = p.weight_kg != null ? p.weight_kg : '';

  // Avatar — prefer custom upload > Strava photo > initials
  renderAvatarEl(qs('#settings-avatar'), p, sc);

  // Header info
  const dnEl = qs('#settings-display-name');
  if (dnEl) dnEl.textContent = p.display_name || p.email || '—';
  const emailEl = qs('#settings-email');
  if (emailEl) emailEl.textContent = state.user?.email || '—';

  // Chips
  selectChipByVal('runner-type', p.runner_type);
  selectChipByVal('goal',        p.goal);
  selectChipByVal('lang',        p.coach_lang);
  selectChipByVal('style',       p.coach_style);

  // Toggles
  setToggle('notif-weekly',   p.notif_weekly);
  setToggle('notif-ranking',  p.notif_ranking);
  setToggle('notif-inactive', p.notif_inactive);
  setToggle('notif-winner',   p.notif_winner);

  // Strava connection status
  updateStravaConnUI(sc);

  // Auto-sync toggle
  const autoSyncToggle = qs('#autosync-toggle');
  const autoSyncRow = qs('#autosync-row');
  if (autoSyncRow) autoSyncRow.style.display = sc ? '' : 'none';
  if (autoSyncToggle) autoSyncToggle.checked = p.auto_sync !== false;

  // Subscription section
  updateSubSection();
}

// ── Strava UI ─────────────────────────────────────────────────────────────

function updateStravaConnUI(sc) {
  const dot           = qs('#strava-conn-dot');
  const statusTxt     = qs('#strava-conn-status');
  const reconnectBtn  = qs('#btn-reconnect-strava');
  const disconnectBtn = qs('#btn-disconnect-strava');

  if (sc) {
    const fullName = [sc.athlete_firstname, sc.athlete_lastname].filter(Boolean).join(' ');
    if (dot)           dot.style.background       = '#6effc0';
    if (statusTxt)     statusTxt.textContent       = fullName ? `Connected as ${fullName}` : 'Connected ✓';
    if (reconnectBtn)  reconnectBtn.style.display  = 'none';
    if (disconnectBtn) disconnectBtn.style.display = '';
  } else {
    if (dot)           dot.style.background       = '#84958a';
    if (statusTxt)     statusTxt.textContent       = 'Not connected';
    if (reconnectBtn)  reconnectBtn.style.display  = '';
    if (disconnectBtn) disconnectBtn.style.display = 'none';
  }
}

// ── Avatar helpers ─────────────────────────────────────────────────────────

function renderAvatarEl(el, profile, stravaConn) {
  if (!el) return;
  const src = profile?.avatar_url || stravaConn?.athlete_profile || null;
  if (src) {
    el.innerHTML = `<img src="${src}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
  } else {
    el.innerHTML  = '';
    el.textContent = (profile?.display_name || profile?.email || '?')[0].toUpperCase();
  }
}

async function handleAvatarChange(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  const MAX_MB = 2;
  if (file.size > MAX_MB * 1024 * 1024) {
    return toast(`Image must be under ${MAX_MB} MB`, 'error');
  }

  const statusEl = qs('#avatar-upload-status');
  const btn = qs('#btn-upload-avatar');
  if (statusEl) statusEl.textContent = 'Uploading…';
  if (btn) { btn.disabled = true; btn.textContent = 'Uploading…'; }

  try {
    const ext  = file.name.split('.').pop();
    const path = `avatars/${state.user.id}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from('profiles')
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) throw upErr;

    const { data: urlData } = supabase.storage.from('profiles').getPublicUrl(path);
    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    const { data: updated, error: dbErr } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', state.user.id)
      .select()
      .single();
    if (dbErr) throw dbErr;

    state.profile = updated;

    renderAvatarEl(qs('#settings-avatar'), updated, state.stravaConnection);
    updateAthleteUI({
      ...(state.stravaConnection || { athlete_firstname: '', athlete_lastname: '' }),
      athlete_profile: publicUrl
    });
    updatePlanUI(updated);

    if (statusEl) statusEl.textContent = 'Photo updated ✓';
    toast('Profile photo updated ✓');
  } catch (err) {
    console.error('Avatar upload error:', err);
    toast(err.message || 'Upload failed', 'error');
    if (statusEl) statusEl.textContent = '';
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Upload photo'; }
    e.target.value = '';
  }
}

// ── Subscription section ───────────────────────────────────────────────────

function updateSubSection() {
  const plan   = state.profile?.plan || 'trial';
  const tag    = qs('#sub-plan-tag');
  const detail = qs('#sub-plan-detail');
  const btn    = qs('#sub-action-btn');

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

// ── Save handlers ─────────────────────────────────────────────────────────

async function saveProfile() {
  if (!state.user) return;

  const btn = qs('#btn-save-profile');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }

    const payload = {
      display_name:  qs('#profile-name')?.value.trim() || null,
      city:          qs('#profile-city')?.value.trim() || null,
      bio:           qs('#profile-bio')?.value.trim()  || null,
      date_of_birth: qs('#profile-dob')?.value  || null,
      weight_kg:     parseFloat(qs('#profile-weight')?.value) || null,
      runner_type:   getSelectedChip('runner-type'),
      goal:          getSelectedChip('goal')
    };

  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', state.user.id)
    .select()
    .single();

  if (btn) { btn.disabled = false; btn.textContent = 'Save profile'; }
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
    coach_lang:  getSelectedChip('lang')  || 'en',
    coach_style: getSelectedChip('style') || 'friendly'
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
    notif_weekly:   getToggle('notif-weekly'),
    notif_ranking:  getToggle('notif-ranking'),
    notif_inactive: getToggle('notif-inactive'),
    notif_winner:   getToggle('notif-winner')
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
  const inp = qs('#new-token-input');
  if (inp) inp.value = '';
  const wrap = qs('#strava-refresh-wrap');
  if (wrap) wrap.style.display = 'none';
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

async function deleteAccount() {
  const ok = confirm('Are you sure? This cannot be undone.');
  if (!ok) return;
  const word = prompt('Type DELETE to confirm:');
  if (word !== 'DELETE') return;

  const { error } = await supabase.functions.invoke('delete-my-account', { body: {} });
  if (error) return toast(error.message, 'error');

  toast('Account deleted');
  setTimeout(() => window.location.replace('./login.html'), 1500);
}

// ── Helpers ───────────────────────────────────────────────────────────────

function selectChipByVal(group, val) {
  if (!val) return;
  document.querySelectorAll(`.m3-chip[data-group="${group}"], .chip[data-group="${group}"]`)
    .forEach(c => c.classList.toggle('on', c.dataset.val === val));
}

function getSelectedChip(group) {
  return document.querySelector(`.m3-chip[data-group="${group}"].on, .chip[data-group="${group}"].on`)?.dataset?.val || null;
}

function setToggle(id, val) {
  const el = qs(`#${id}`);
  if (el) el.checked = !!val;
}

function getToggle(id) {
  return qs(`#${id}`)?.checked || false;
}
