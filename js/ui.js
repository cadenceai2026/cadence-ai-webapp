import { qs, qsa, show, hide } from './utils.js';

export function showAuthScreen() {
  qs('#screen-auth').classList.add('active');
  qs('#screen-app').classList.remove('active');
  
  const topbar = qs('#mob-topbar') || qs('#mobile-topbar');
  const nav = qs('#mobile-nav');
  
  if (topbar) topbar.style.display = 'none';
  if (nav) nav.style.display = 'none';
}

export function showAppScreen() {
  qs('#screen-auth').classList.remove('active');
  qs('#screen-app').classList.add('active');
  
  // Corrección: usar el ID correcto que sí existe en app.html
  const topbar = qs('#mob-topbar') || qs('#mobile-topbar');
  const nav = qs('#mobile-nav');
  
  if (topbar) topbar.style.display = 'flex';
  if (nav) nav.style.display = 'block';
}

export function showAuthView(name) {
  ['signin', 'signup', 'check-email', 'strava'].forEach(v => {
    const el = qs(`#view-${v}`);
    if (el) el.style.display = v === name ? 'block' : 'none';
  });
}

export function showPage(name) {
  qsa('.page').forEach(p => p.classList.remove('active'));
  qsa('.nav-item').forEach(n => n.classList.remove('active'));
  qsa('.mob-nav-item').forEach(n => n.classList.remove('active'));

  const page = qs(`#page-${name}`);
  if (page) page.classList.add('active');

  qs(`.nav-item[data-page="${name}"]`)?.classList.add('active');
  qs(`#mob-nav-${name}`)?.classList.add('active');

  const titles = {
    dashboard: 'Dashboard',
    coach: 'AI Coach',
    activities: 'Activities',
    groups: 'Groups',
    ranking: 'Ranking 🏆',
    pricing: 'Upgrade to Elite',
    settings: 'Settings',
    admin: 'Admin 🛡️'
  };
  const titleEl = qs('#page-title');
  if (titleEl) titleEl.textContent = titles[name] || name;
}

export function updatePlanUI(profile) {
  const plan = profile?.plan || 'trial';
  const days = daysUntil(profile?.trial_ends_at);

  const label = qs('#plan-label');
  const name = qs('#plan-name');
  const sub = qs('#plan-sub');
  const upgradeBtn = qs('#upgrade-btn');
  const planTag = qs('#sb-plan-tag');
  const mobBadge = qs('#mob-plan-badge');

  if (plan === 'elite') {
    if (label) label.textContent = 'ELITE';
    if (name) name.textContent = 'Cadence Elite';
    if (sub) sub.textContent = 'Full access';
    if (upgradeBtn) upgradeBtn.style.display = 'none';
    if (planTag) planTag.textContent = 'ELITE';
    if (mobBadge) { mobBadge.textContent = 'ELITE'; mobBadge.className = 'mob-plan-badge elite'; }
  } else if (plan === 'trial') {
    if (label) label.textContent = 'FREE TRIAL';
    if (name) name.textContent = `${days} days left`;
    if (sub) sub.textContent = 'Upgrade to Elite';
    if (planTag) planTag.textContent = 'TRIAL';
    if (mobBadge) { mobBadge.textContent = 'TRIAL'; mobBadge.className = 'mob-plan-badge trial'; }
  } else {
    if (label) label.textContent = 'FREE';
    if (name) name.textContent = 'Starter';
    if (sub) sub.textContent = 'Upgrade to Elite';
    if (planTag) planTag.textContent = 'FREE';
    if (mobBadge) { mobBadge.textContent = 'FREE'; mobBadge.className = 'mob-plan-badge free'; }
  }
}

export function updateAthleteUI(connection) {
  if (!connection) return;
  const name = `${connection.athlete_firstname || ''} ${connection.athlete_lastname || ''}`.trim();
  const nameEl = qs('#sb-name');
  const mobAv = qs('#mob-avatar');
  const sbAv = qs('#sb-avatar');

  if (nameEl) nameEl.textContent = name || 'Runner';

  const imgHtml = connection.athlete_profile
    ? `<img src="${connection.athlete_profile}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
    : (name[0] || 'R').toUpperCase();

  if (mobAv) mobAv.innerHTML = imgHtml;
  if (sbAv) sbAv.innerHTML = imgHtml;
}

export function showEliteWelcome() {
  const modal = qs('#elite-modal');
  if (modal) modal.style.display = 'flex';
}

import { daysUntil } from './utils.js';