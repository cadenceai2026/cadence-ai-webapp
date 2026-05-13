import { state } from './state.js';
import { navigate } from './router.js';
import { qs, fmtTime, fmtPace, fmtDist, typeIcon, esc } from './utils.js';
import { renderXPBar, renderStreakBadge, getWeeklyKmFromActivities, LEAGUES } from './game.js';

export function renderDashboard() {
  const acts = state.activities || [];
  const runs = acts.filter(a => a.sport_type === 'Run' || a.sport_type === 'TrailRun');

  const totalDist = acts.reduce((s, a) => s + (a.distance || 0), 0);
  const totalTime = acts.reduce((s, a) => s + (a.moving_time || 0), 0);
  const totalElev = acts.reduce((s, a) => s + (a.total_elevation_gain || 0), 0);
  const avgPace = runs.length
    ? runs.reduce((s, a) => s + (a.moving_time / (a.distance / 1000)), 0) / runs.length
    : 0;

  const count = qs('#s-count');
  const dist  = qs('#s-dist');
  const time  = qs('#s-time');
  const elev  = qs('#s-elev');
  const pace  = qs('#s-pace');

  if (count) count.textContent = acts.length;
  if (dist)  dist.textContent  = fmtDist(totalDist);
  if (time)  time.textContent  = (totalTime / 3600).toFixed(1);
  if (elev)  elev.textContent  = Math.round(totalElev).toLocaleString();
  if (pace)  pace.textContent  = avgPace > 0 ? fmtPace(avgPace) : '—';

  // ── Render game widgets ──
  renderXPBar('dash-xp-bar');
  renderStreakBadge('dash-streak');
  renderRivalCallout();

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

// ── RIVAL CALLOUT (on dashboard) ─────────────────────────────────────────────
function renderRivalCallout() {
  const el = qs('#dash-rival-callout');
  if (!el) return;

  const battle = state.activeBattle;
  const rival  = state.rival;

  if (!battle && !rival) {
    el.innerHTML = `
      <div class="rival-callout no-rival">
        <span>⚔️ No rival yet</span>
        <button class="rival-callout-btn" onclick="navigate('battles')">Find rival →</button>
      </div>`;
    return;
  }

  const youKm   = parseFloat(battle?.challenger_km || 0);
  const rivKm   = parseFloat(battle?.opponent_km   || 0);
  const diff    = Math.abs(youKm - rivKm).toFixed(1);
  const winning = youKm > rivKm;
  const tied    = youKm === rivKm;
  const rivName = rival?.display_name || battle?.opponent_name || 'Rival';

  let statusText, statusClass;
  if (winning)   { statusText = `🏆 You're ahead of ${rivName} by ${diff} km!`;   statusClass = 'winning'; }
  else if (tied) { statusText = `🤝 Tied with ${rivName}! Every km matters.`;      statusClass = 'tied'; }
  else           { statusText = `⚠️ ${rivName} is ahead by ${diff} km — run now!`; statusClass = 'losing'; }

  el.innerHTML = `
    <div class="rival-callout ${statusClass}">
      <div class="rival-callout-av">${(rivName[0] || 'R').toUpperCase()}</div>
      <div class="rival-callout-text">
        <div class="rival-callout-msg">${statusText}</div>
        <div class="rival-callout-sub">Week ${battle?.week_number || '?'} · ${Math.ceil((new Date(battle?.end_date || Date.now() + 4 * 86400000) - Date.now()) / 86400000)} days left</div>
      </div>
      <button class="rival-callout-btn" onclick="navigate('battles')">View battle →</button>
    </div>`;
}

// ── ACTIVITY CARD ─────────────────────────────────────────────────────────────
export function actCard(a) {
  const type       = a.sport_type || 'Workout';
  const dist       = fmtDist(a.distance || 0);
  const time       = fmtTime(a.moving_time);
  const isRun      = type === 'Run' || type === 'TrailRun';
  const third      = isRun && a.distance > 0
    ? fmtPace(a.moving_time / (a.distance / 1000))
    : `${Math.round(a.total_elevation_gain || 0)}m`;
  const thirdLabel = isRun ? 'Pace /km' : 'Elevation';
  const date       = new Date(a.start_date_local || a.start_date)
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
