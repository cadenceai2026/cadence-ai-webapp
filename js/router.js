import { qs, qsa } from './utils.js';
import { showPage } from './ui.js';
import { loadSettingsUI } from './settings.js';
import { loadGroups } from './groups.js';
import { loadRanking } from './ranking.js';
import { loadAdminData } from './admin.js';

export function initRouter() {
  // Desktop nav
  qsa('.nav-item[data-page]').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.page));
  });

  // Mobile nav
  qsa('.mob-nav-btn[data-page]').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.page));
  });

  // Mobile plan badge → pricing
  qs('#mob-plan-badge')?.addEventListener('click', () => navigate('pricing'));
  qs('#mob-avatar')?.addEventListener('click', () => navigate('settings'));
}

export function navigate(name) {
  showPage(name);

  // Side effects per page
  if (name === 'settings') loadSettingsUI();
  if (name === 'groups') loadGroups();
  if (name === 'ranking') loadRanking();
  if (name === 'admin') loadAdminData();
}
