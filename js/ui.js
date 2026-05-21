import { qs, qsa, show, hide } from './utils.js';
import { daysUntil } from './utils.js';

export function showAppScreen() {
  const loading = qs('#screen-loading');
  if (loading) loading.style.display = 'none';
  
  const app = qs('#screen-app');
  if (app) app.style.display = 'block';

  const topbar = qs('#mob-topbar');
  const nav = qs('#mob-nav');
  if (topbar) topbar.style.display = 'flex';
  if (nav) nav.style.display = 'block';
}

export function showPage(name) {
  qsa('.page').forEach(p => p.classList.remove('active'));
  qsa('.nav-item').forEach(n => n.classList.remove('active'));
  qsa('.mob-nav-btn').forEach(n => n.classList.remove('active'));

  const page = qs(`#page-${name}`);
  if (page) page.classList.add('active');

  qs(`.nav-item[data-page="${name}"]`)?.classList.add('active');
  qs(`.mob-nav-btn[data-page="${name}"]`)?.classList.add('active');

  const titles = {
    dashboard:  'Dashboard',
    coach:      'AI Coach',
    activities: 'Activities',
    groups:     'Groups',
    ranking:    'Ranking 🏆',
    pricing:    'Upgrade to Elite',
    settings:   'Settings',
    admin:      'Admin 🛡️',
    battles:    '⚔️ Battles',
    battlepass: '🎫 Battle Pass',
    leagues:    '🏆 Leagues',
    challenges: '⚡ Challenges',
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
    if (mobBadge) { 
      mobBadge.textContent = 'ELITE'; 
      mobBadge.className = 'mob-plan-badge elite'; 
    }
  } else if (plan === 'trial') {
    if (label) label.textContent = 'FREE TRIAL';
    if (name) name.textContent = `${days} days left`;
    if (sub) sub.textContent = 'Upgrade to Elite';
    if (planTag) planTag.textContent = 'TRIAL';
    if (mobBadge) { 
      mobBadge.textContent = 'TRIAL'; 
      mobBadge.className = 'mob-plan-badge trial'; 
    }
  } else {
    if (label) label.textContent = 'FREE';
    if (name) name.textContent = 'Starter';
    if (sub) sub.textContent = 'Upgrade to Elite';
    if (planTag) planTag.textContent = 'FREE';
    if (mobBadge) { 
      mobBadge.textContent = 'FREE'; 
      mobBadge.className = 'mob-plan-badge free'; 
    }
  }
}

export function updateAthleteUI(connection) {
  if (!connection) return;
  const name = `${connection.athlete_firstname || ''} ${connection.athlete_lastname || ''}`.trim();
  const nameEl = qs('#sb-name');
  const mobAv  = qs('#mob-avatar');
  const sbAv   = qs('#sb-avatar');

  if (nameEl) nameEl.textContent = name || 'Runner';

  // Prefer custom uploaded avatar over Strava photo
  const photoSrc = connection.athlete_profile || null;
  const imgHtml = photoSrc
    ? `<img src="${photoSrc}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
    : (name[0] || 'R').toUpperCase();

  if (mobAv) mobAv.innerHTML = imgHtml;
  if (sbAv)  sbAv.innerHTML  = imgHtml;
}

export function showEliteWelcome() {
  const modal = qs('#elite-modal');
  if (modal) modal.style.display = 'flex';
}

export function applySimplicityRule(level) {
  const isBeginner = level < 3;
  // Hide advanced nav items for beginners
  qsa('.nav-item[data-page="leagues"], .nav-item[data-page="battlepass"], .mob-nav-btn[data-page="leagues"], .mob-nav-btn[data-page="battlepass"]').forEach(el => {
    el.style.display = isBeginner ? 'none' : '';
  });
}

