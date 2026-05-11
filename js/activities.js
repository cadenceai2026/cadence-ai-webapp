import { state } from './state.js';
import { qs } from './utils.js';
import { actCard } from './dashboard.js';

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

  container.innerHTML = filtered.length
    ? filtered.map(actCard).join('')
    : '<div class="empty">No activities found.</div>';
}
