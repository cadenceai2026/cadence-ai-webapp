const fs = require('fs');
let content = fs.readFileSync('js/dashboard.js', 'utf8');

// 1. Replace renderXPBar call with custom segments
content = content.replace("import { renderXPBar, renderStreakBadge, getWeeklyKmFromActivities, LEAGUES } from './game.js';", "import { renderStreakBadge, getWeeklyKmFromActivities, LEAGUES, xpProgressInLevel, xpNeededForNextLevel } from './game.js';");

const oldRenderWidgets = `  // ── Render game widgets ──
  renderXPBar('dash-xp-bar');
  renderStreakBadge('dash-streak');
  renderRivalCallout();`;

const newRenderWidgets = `  // ── Render game widgets ──
  // renderXPBar('dash-xp-bar'); // Replaced by inline custom render to match Tailwind UI
  if (state.gameProfile) {
    const gp = state.gameProfile;
    const prog = xpProgressInLevel(gp.total_xp);
    const needed = xpNeededForNextLevel(gp.total_xp);
    const pct = Math.min(100, (prog / needed) * 100);
    const totalSegments = 9;
    const filledSegments = Math.floor((pct / 100) * totalSegments);
    
    const xpText = qs('#dash-xp-text');
    if (xpText) xpText.textContent = \`\${prog.toLocaleString()} / \${needed.toLocaleString()} XP\`;
    
    const xpBar = qs('#dash-xp-bar');
    if (xpBar) {
      let html = '';
      for (let i = 0; i < totalSegments; i++) {
        const isFilled = i < filledSegments;
        const isPurple = gp.level >= 3 && i < filledSegments - 1; 
        html += \`<div class="progress-segment \${isPurple ? 'filled-purple' : (isFilled ? 'filled' : '')}"></div>\`;
      }
      xpBar.innerHTML = html;
    }
  }

  renderStreakBadge('dash-streak');
  renderRivalCallout();`;

content = content.replace(oldRenderWidgets, newRenderWidgets);

// 2. Rewrite renderRivalCallout
const oldRival = `// ── RIVAL CALLOUT (on dashboard) ─────────────────────────────────────────────
function renderRivalCallout() {
  const el = qs('#dash-rival-callout');
  if (!el) return;

  const battle = state.activeBattle;
  const rival  = state.rival;

  if (!battle && !rival) {
    el.innerHTML = \`
      <div class="rival-callout no-rival">
        <span>⚔️ No rival yet</span>
        <button class="rival-callout-btn" onclick="navigate('battles')">Find rival →</button>
      </div>\`;
    return;
  }

  const youKm   = parseFloat(battle?.challenger_km || 0);
  const rivKm   = parseFloat(battle?.opponent_km   || 0);
  const diff    = Math.abs(youKm - rivKm).toFixed(1);
  const winning = youKm > rivKm;
  const tied    = youKm === rivKm;
  const rivName = rival?.display_name || battle?.opponent_name || 'Rival';

  let statusText, statusClass;
  if (winning)   { statusText = \`🏆 You're ahead of \${rivName} by \${diff} km!\`;   statusClass = 'winning'; }
  else if (tied) { statusText = \`🤝 Tied with \${rivName}! Every km matters.\`;      statusClass = 'tied'; }
  else           { statusText = \`⚠️ \${rivName} is ahead by \${diff} km — run now!\`; statusClass = 'losing'; }

  el.innerHTML = \`
    <div class="rival-callout \${statusClass}">
      <div class="rival-callout-av">\${(rivName[0] || 'R').toUpperCase()}</div>
      <div class="rival-callout-text">
        <div class="rival-callout-msg">\${statusText}</div>
        <div class="rival-callout-sub">Week \${battle?.week_number || '?'} · \${Math.ceil((new Date(battle?.end_date || Date.now() + 4 * 86400000) - Date.now()) / 86400000)} days left</div>
      </div>
      <button class="rival-callout-btn" onclick="navigate('battles')">View battle →</button>
    </div>\`;
}`;

const newRival = `// ── RIVAL CALLOUT (on dashboard) ─────────────────────────────────────────────
function renderRivalCallout() {
  const el = qs('#dash-rival-callout');
  if (!el) return;

  const battle = state.activeBattle;
  const rival  = state.rival;

  if (!battle && !rival) {
    el.innerHTML = \`
      <div class="glass-panel border border-outline-variant/30 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 mt-6">
        <div class="flex items-center gap-4">
          <div class="h-12 w-12 rounded-full border border-outline-variant/50 bg-surface-container flex items-center justify-center text-[20px]">⚔️</div>
          <div>
            <h3 class="font-headline-md text-neon-white text-[16px] uppercase tracking-wide">NO ACTIVE RIVAL</h3>
            <p class="font-label-caps text-on-surface-variant text-[10px] uppercase tracking-widest mt-1">Get matched to earn 1.5x XP</p>
          </div>
        </div>
        <button class="bg-primary text-on-primary hover:bg-primary-fixed transition-colors font-label-caps uppercase tracking-widest text-[12px] py-2 px-6 rounded w-full md:w-auto" onclick="navigate('battles')">Find Rival →</button>
      </div>\`;
    return;
  }

  const youKm   = parseFloat(battle?.challenger_km || 0);
  const rivKm   = parseFloat(battle?.opponent_km   || 0);
  const diff    = Math.abs(youKm - rivKm).toFixed(1);
  const winning = youKm > rivKm;
  const tied    = youKm === rivKm;
  const rivName = rival?.display_name || battle?.opponent_name || 'Rival';

  let statusText, statusColor, emoji;
  if (winning)   { statusText = \`Ahead by \${diff} km\`; statusColor = 'text-primary'; emoji = '🏆'; }
  else if (tied) { statusText = \`Tied\`; statusColor = 'text-secondary'; emoji = '🤝'; }
  else           { statusText = \`Behind by \${diff} km\`; statusColor = 'text-error'; emoji = '⚠️'; }

  el.innerHTML = \`
    <div class="glass-panel border border-outline-variant/30 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 mt-6 relative overflow-hidden group hover:border-primary/50 transition-colors">
      <div class="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
      <div class="flex items-center gap-4 relative z-10">
        <div class="h-12 w-12 rounded-full border border-\${winning ? 'primary' : 'outline-variant'} bg-surface-container flex items-center justify-center text-[20px] font-headline-md">\${(rivName[0] || 'R').toUpperCase()}</div>
        <div>
          <h3 class="font-headline-md text-neon-white text-[16px] uppercase tracking-wide">\${emoji} \${rivName}</h3>
          <p class="font-label-caps \${statusColor} text-[10px] uppercase tracking-widest mt-1">\${statusText}</p>
        </div>
      </div>
      <button class="bg-surface-container border border-primary text-primary hover:bg-primary hover:text-on-primary transition-colors font-label-caps uppercase tracking-widest text-[12px] py-2 px-6 rounded w-full md:w-auto relative z-10" onclick="navigate('battles')">View Battle →</button>
    </div>\`;
}`;

content = content.replace(oldRival, newRival);
fs.writeFileSync('js/dashboard.js', content);
console.log('dashboard.js updated');
