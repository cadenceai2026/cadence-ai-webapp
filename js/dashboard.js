import { state } from './state.js';
import { navigate } from './router.js';
import { qs, fmtTime, fmtPace, fmtDist, typeIcon, esc } from './utils.js';
import { renderStreakBadge, getWeeklyKmFromActivities, LEAGUES, xpProgressInLevel, xpNeededForNextLevel } from './game.js';

export function renderDashboard() {
  renderHeatmap();
  renderBadges();

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
    <div class="glass-panel border border-outline-variant/30 rounded-xl p-4 flex flex-col gap-4 relative overflow-hidden group hover:border-primary/50 transition-colors">
      <div class="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
      <div class="flex justify-between items-start relative z-10">
        <div>
          <div class="font-headline-md text-neon-white text-[16px] uppercase tracking-wide truncate pr-2 max-w-[200px]">${esc(a.name || 'Activity')}</div>
          <div class="font-label-caps text-on-surface-variant text-[10px] uppercase tracking-widest mt-1">${type} · ${date}</div>
        </div>
        <div class="w-10 h-10 rounded bg-surface-container border border-outline-variant/50 flex items-center justify-center text-[20px]">
          ${typeIcon(type)}
        </div>
      </div>
      <div class="flex items-center gap-6 relative z-10 pt-2 border-t border-outline-variant/20 mt-auto">
        <div>
          <div class="font-data-display text-primary text-[18px] leading-none mb-1">${dist}</div>
          <div class="font-label-caps text-on-surface-variant text-[10px] uppercase tracking-widest">KM</div>
        </div>
        <div>
          <div class="font-data-display text-neon-white text-[18px] leading-none mb-1">${time}</div>
          <div class="font-label-caps text-on-surface-variant text-[10px] uppercase tracking-widest">TIME</div>
        </div>
        <div>
          <div class="font-data-display text-neon-white text-[18px] leading-none mb-1">${third}</div>
          <div class="font-label-caps text-on-surface-variant text-[10px] uppercase tracking-widest">${thirdLabel}</div>
        </div>
      </div>
    </div>`;
}

// ── HEATMAP ──────────────────────────────────────────────────────────────────
function renderHeatmap() {
  const el = qs('#dash-heatmap');
  if (!el) return;
  if (!state.activities || state.activities.length === 0) {
    el.innerHTML = '<div class="empty" style="padding:16px 0;font-size:0.8rem">No data for heatmap</div>';
    return;
  }

  const today = new Date();
  today.setHours(0,0,0,0);
  const days = [];
  const map = {};
  
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    days.push(dateStr);
    map[dateStr] = 0;
  }

  state.activities.forEach(a => {
    const isRun = a.sport_type === 'Run' || a.sport_type === 'TrailRun';
    if (!isRun) return;
    const dateStr = (a.start_date_local || a.start_date).split('T')[0];
    if (map[dateStr] !== undefined) {
      map[dateStr] += (a.distance || 0) / 1000;
    }
  });

  let html = `<div class="heatmap-flex">`;
  days.forEach(d => {
    const km = map[d];
    let level = 0;
    if (km > 0) level = 1;
    if (km >= 5) level = 2;
    if (km >= 10) level = 3;
    if (km >= 20) level = 4;
    
    html += `<div class="heatmap-cell level-${level}" title="${d}: ${km.toFixed(1)} km"></div>`;
  });
  html += `</div>`;
  el.innerHTML = html;
}

// ── BADGES ───────────────────────────────────────────────────────────────────
function renderBadges() {
  const el = qs('#dash-badges');
  if (!el) return;
  
  const b = [];
  const acts = state.activities || [];
  const runs = acts.filter(a => a.sport_type === 'Run' || a.sport_type === 'TrailRun');
  const level = state.gameProfile?.level || 1;
  const streak = state.gameProfile?.streak_days || 0;
  
  if (runs.length > 0) b.push({ icon: '👟', name: 'First Steps', desc: 'Logged your first run' });
  if (runs.some(r => r.distance >= 5000)) b.push({ icon: '🔥', name: '5K Finisher', desc: 'Ran 5 km in one session' });
  if (runs.some(r => r.distance >= 10000)) b.push({ icon: '⚡', name: '10K Finisher', desc: 'Ran 10 km in one session' });
  if (runs.some(r => r.distance >= 21000)) b.push({ icon: '🏅', name: 'Half Marathon', desc: 'Ran 21.1 km in one session' });
  if (level >= 5) b.push({ icon: '🌟', name: 'Level 5', desc: 'Reached Level 5' });
  if (level >= 10) b.push({ icon: '👑', name: 'Level 10', desc: 'Reached Level 10' });
  if (streak >= 3) b.push({ icon: '🔥', name: '3-Day Streak', desc: 'Ran 3 days in a row' });
  if (streak >= 7) b.push({ icon: '💥', name: '1-Week Streak', desc: 'Ran 7 days in a row' });

  if (b.length === 0) {
    el.innerHTML = '<div class="empty" style="padding:16px 0;font-size:0.8rem">Run more to earn badges!</div>';
    return;
  }
  
  const html = b.map(badge => `
    <div class="badge-card">
      <div class="badge-icon">${badge.icon}</div>
      <div class="badge-name">${badge.name}</div>
      <div class="badge-desc">${badge.desc}</div>
    </div>
  `).join('');
  
  el.innerHTML = html;
}
