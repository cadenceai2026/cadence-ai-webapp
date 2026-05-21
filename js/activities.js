import { state } from './state.js';
import { qs } from './utils.js';
import { actCard } from './dashboard.js';
import { navigate } from './router.js';

let currentFilter = 'all';

export function initActivities() {
  document.querySelectorAll('#act-filters .btn-sm').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#act-filters .btn-sm').forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
      currentFilter = btn.dataset.filter;
      renderActivities();
    });
  });
}

export function renderActivities() {
  const container = qs('#all-acts');
  if (!container) return;

  const filtered = currentFilter === 'all'
    ? state.activities
    : state.activities.filter(a => {
        const t = a.sport_type || '';
        if (currentFilter === 'Run') return t === 'Run' || t === 'TrailRun';
        return t === currentFilter;
      });

  if (state.syncError) {
    container.innerHTML = `
      <div class="empty" style="padding:40px 16px; border: 1px solid #ff4444; border-radius: 12px; background: rgba(255, 68, 68, 0.05);">
        <div style="font-size:2rem;margin-bottom:12px">⚠️</div>
        <div style="font-weight:600;margin-bottom:6px;color:#ff4444">Sync Error</div>
        <div style="font-size:0.85rem;color:var(--muted);margin-bottom:20px">${state.syncError}</div>
        <button id="act-retry-sync-btn" style="background:var(--surface3);color:var(--text);border:1px solid var(--border);font-weight:600;font-size:0.9rem;padding:8px 16px;border-radius:8px;cursor:pointer">Retry Sync ↻</button>
      </div>`;
    qs('#act-retry-sync-btn')?.addEventListener('click', async () => {
      const { syncActivities } = await import('./strava.js');
      state.syncError = null;
      renderActivities();
      syncActivities();
    });
    return;
  }

  if (filtered.length) {
    container.innerHTML = filtered.map(actCard).join('');
  } else if (!state.stravaConnection) {
    container.innerHTML = `
      <div class="empty" style="padding:40px 16px">
        <div style="font-size:2rem;margin-bottom:12px">🟠</div>
        <div style="font-weight:600;margin-bottom:6px">Connect Strava to see your activities</div>
        <div style="font-size:0.85rem;color:var(--muted);margin-bottom:20px">Link your account to sync runs, rides and workouts automatically.</div>
        <button id="act-connect-strava-btn" style="background:#FC4C02;color:#fff;border:none;font-weight:600;font-size:0.9rem;padding:11px 24px;border-radius:8px;cursor:pointer">Connect Strava →</button>
      </div>`;
    qs('#act-connect-strava-btn')?.addEventListener('click', () => navigate('settings'));
  } else {
    container.innerHTML = '<div class="empty">No activities found. Click ↻ Sync to load them.</div>';
  }
}
