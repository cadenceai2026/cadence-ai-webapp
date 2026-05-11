import { state } from './state.js';
import { navigate } from './router.js';
import { qs, fmtTime, fmtPace, fmtDist, typeIcon, esc } from './utils.js';

export function renderDashboard() {
  const acts = state.activities || [];
  const runs = acts.filter(a => a.sport_type === 'Run');

  const totalDist = acts.reduce((s, a) => s + (a.distance || 0), 0);
  const totalTime = acts.reduce((s, a) => s + (a.moving_time || 0), 0);
  const totalElev = acts.reduce((s, a) => s + (a.total_elevation_gain || 0), 0);
  const avgPace = runs.length
    ? runs.reduce((s, a) => s + (a.moving_time / (a.distance / 1000)), 0) / runs.length
    : 0;

  const count = qs('#s-count');
  const dist = qs('#s-dist');
  const time = qs('#s-time');
  const elev = qs('#s-elev');
  const pace = qs('#s-pace');

  if (count) count.textContent = acts.length;
  if (dist) dist.textContent = fmtDist(totalDist);
  if (time) time.textContent = (totalTime / 3600).toFixed(1);
  if (elev) elev.textContent = Math.round(totalElev).toLocaleString();
  if (pace) pace.textContent = avgPace > 0 ? fmtPace(avgPace) : '—';

  const container = qs('#dash-acts');
  if (!container) return;

  const recent = acts.slice(0, 6);
  if (recent.length) {
    container.innerHTML = recent.map(actCard).join('');
  } else if (!state.stravaConnection) {
    container.innerHTML = `
      <div class="empty" style="padding:32px 16px">
        <div style="font-size:2rem;margin-bottom:12px">🟠</div>
        <div style="font-weight:600;margin-bottom:6px">Connect Strava to see your activities</div>
        <div style="font-size:0.85rem;color:var(--muted);margin-bottom:20px">Link your account to sync runs, rides and workouts.</div>
        <button id="dash-connect-strava" style="background:#FC4C02;color:#fff;border:none;font-weight:600;font-size:0.9rem;padding:11px 24px;border-radius:8px;cursor:pointer">Connect Strava →</button>
      </div>`;
    document.getElementById('dash-connect-strava')?.addEventListener('click', () => navigate('settings'));
  } else {
    container.innerHTML = '<div class="empty">No activities yet — click ↻ Sync to load them.</div>';
  }
}

export function actCard(a) {
  const type = a.sport_type || 'Workout';
  const dist = fmtDist(a.distance || 0);
  const time = fmtTime(a.moving_time);
  const isRun = type === 'Run' || type === 'TrailRun';
  const third = isRun && a.distance > 0
    ? fmtPace(a.moving_time / (a.distance / 1000))
    : `${Math.round(a.total_elevation_gain || 0)}m`;
  const thirdLabel = isRun ? 'Pace /km' : 'Elevation';
  const date = new Date(a.start_date_local || a.start_date)
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return `
    <div class="act-card">
      <div class="act-header">
        <div>
          <div class="act-name">${esc(a.name || 'Activity')}</div>
          <div class="act-meta">${type} · ${date}</div>
        </div>
        <div class="act-icon">${typeIcon(type)}</div>
      </div>
      <div class="act-stats">
        <div class="act-stat">
          <span class="act-stat-val">${dist}</span>
          <span class="act-stat-lbl">km</span>
        </div>
        <div class="act-stat">
          <span class="act-stat-val">${time}</span>
          <span class="act-stat-lbl">Time</span>
        </div>
        <div class="act-stat">
          <span class="act-stat-val">${third}</span>
          <span class="act-stat-lbl">${thirdLabel}</span>
        </div>
      </div>
    </div>`;
}
