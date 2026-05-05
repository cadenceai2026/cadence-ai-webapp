import { state } from './state.js';
import { qs } from './utils.js';
import { actCard } from './dashboard.js';

let currentFilter = 'all';

export function initActivities() {
  document.querySelectorAll('#act-filters .btn-sm').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#act-filters .btn-sm').forEach(b => b.classList.remove('green'));
      btn.classList.add('green');
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
    : state.activities.filter(a => (a.sport_type || '') === currentFilter);

  container.innerHTML = filtered.length
    ? filtered.map(actCard).join('')
    : '<div class="empty">No activities found.</div>';
}
