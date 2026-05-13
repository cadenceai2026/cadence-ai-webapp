/**
 * battles.js — 1v1 km battle screen: rendering, progress bars, history.
 */
import { supabase } from './supabase-client.js';
import { state } from './state.js';
import { qs, toast } from './utils.js';
import { getMockBattle, getMockRival } from './game.js';

// ── LOAD DATA ─────────────────────────────────────────────────────────────────
async function loadBattleData() {
  if (!state.user) {
    state.activeBattle = getMockBattle();
    state.rival        = getMockRival();
    return;
  }
  try {
    const { data: battles } = await supabase
      .from('battles')
      .select('*')
      .or(`challenger_id.eq.${state.user.id},opponent_id.eq.${state.user.id}`)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    state.activeBattle = battles || getMockBattle();
  } catch {
    state.activeBattle = getMockBattle();
  }

  if (!state.rival) {
    state.rival = getMockRival();
  }
}

// ── TIME REMAINING ────────────────────────────────────────────────────────────
function formatTimeRemaining(endDateStr) {
  const diff = new Date(endDateStr) - Date.now();
  if (diff <= 0) return 'Ended';
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  if (d > 0) return `${d}d ${h}h left`;
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m left`;
}

// ── PROGRESS BAR WIDTHS ────────────────────────────────────────────────────────
function getBarWidths(youKm, rivalKm) {
  const total = youKm + rivalKm;
  if (total === 0) return { you: 50, rival: 50 };
  const rawYou = (youKm / total) * 100;
  return {
    you:   Math.max(12, Math.min(88, rawYou)),
    rival: Math.max(12, Math.min(88, 100 - rawYou)),
  };
}

// ── RENDER BATTLE SCREEN ──────────────────────────────────────────────────────
export async function renderBattleScreen() {
  await loadBattleData();

  const battle = state.activeBattle;
  const rival  = state.rival;
  const hero   = qs('#battle-hero');
  const empty  = qs('#battle-empty');

  if (!battle) {
    if (hero)  hero.style.display  = 'none';
    if (empty) empty.style.display = 'flex';
    renderBattleHistory([]);
    return;
  }

  if (hero)  hero.style.display  = '';
  if (empty) empty.style.display = 'none';

  const youKm    = parseFloat(battle.challenger_km || 0);
  const rivalKm  = parseFloat(battle.opponent_km   || 0);
  const diffKm   = (rivalKm - youKm).toFixed(1);
  const winning  = youKm > rivalKm;
  const tied     = youKm === rivalKm;
  const barW     = getBarWidths(youKm, rivalKm);
  const userInitial = (state.profile?.display_name || 'Y')[0].toUpperCase();
  const timeLeft = formatTimeRemaining(battle.end_date);

  // Title / timer
  const titleEl = qs('#battle-title');
  const timerEl = qs('#battle-timer');
  if (titleEl) titleEl.textContent = `⚔️ ${battle.title || 'Battle'} · Week ${battle.week_number || ''}`;
  if (timerEl) timerEl.textContent = timeLeft;

  // You side
  const youKmEl = qs('#battle-you-km');
  const youAvEl = qs('#battle-you-av');
  if (youKmEl) youKmEl.textContent = `${youKm.toFixed(1)} km`;
  if (youAvEl) youAvEl.textContent = userInitial;

  // Rival side
  const rivKmEl = qs('#battle-rival-km');
  const rivAvEl = qs('#battle-rival-av');
  const rivNmEl = qs('#battle-rival-name');
  if (rivKmEl) rivKmEl.textContent = `${rivalKm.toFixed(1)} km`;
  if (rivAvEl) rivAvEl.textContent = rival?.avatar_initial || (rival?.display_name?.[0] || 'R').toUpperCase();
  if (rivNmEl) rivNmEl.textContent = rival?.display_name || battle.opponent_name || 'Rival';

  // Status badge
  const badge = qs('#battle-status-badge');
  if (badge) {
    if (winning) { badge.textContent = '🏆 WINNING'; badge.className = 'battle-status-badge winning'; }
    else if (tied) { badge.textContent = '🤝 TIED';  badge.className = 'battle-status-badge tied'; }
    else { badge.textContent = '⚠️ BEHIND'; badge.className = 'battle-status-badge losing'; }
  }

  // Progress bar (animate after small delay)
  const barYou   = qs('#battle-bar-you');
  const barRival = qs('#battle-bar-rival');
  if (barYou)   barYou.style.width   = '50%';
  if (barRival) barRival.style.width = '50%';
  requestAnimationFrame(() => {
    setTimeout(() => {
      if (barYou)   barYou.style.width   = `${barW.you}%`;
      if (barRival) barRival.style.width = `${barW.rival}%`;
    }, 150);
  });

  // Status message
  const msgEl = qs('#battle-message');
  if (msgEl) {
    if (winning)    msgEl.innerHTML = `🏆 You're ahead by <strong>${(-diffKm).toFixed(1)} km</strong> — keep the lead!`;
    else if (tied)  msgEl.innerHTML = `🤝 It's a tie! Every km counts now.`;
    else            msgEl.innerHTML = `⚠️ Losing by <strong>${diffKm} km</strong> — time to run!`;
    msgEl.className = `battle-message ${winning ? 'winning' : tied ? 'tied' : 'losing'}`;
  }

  // Render history (mock past battles)
  renderBattleHistory(getMockBattleHistory());
}

function getMockBattleHistory() {
  return [
    { week: 19, opponent: 'Alex M.', you: 18.4, rival: 15.2, won: true  },
    { week: 18, opponent: 'Sam T.',  you: 12.1, rival: 16.8, won: false },
    { week: 17, opponent: 'Alex M.', you: 21.0, rival: 19.5, won: true  },
  ];
}

function renderBattleHistory(history) {
  const el = qs('#battle-history');
  if (!el) return;
  if (!history.length) {
    el.innerHTML = '<div class="empty" style="padding:24px 0">No past battles yet — keep competing!</div>';
    return;
  }
  el.innerHTML = history.map(b => `
    <div class="battle-hist-row ${b.won ? 'won' : 'lost'}">
      <div class="battle-hist-badge">${b.won ? '🏆 WIN' : '💀 LOSS'}</div>
      <div class="battle-hist-opp">vs ${b.opponent}</div>
      <div class="battle-hist-score">
        <span class="${b.won ? 'score-win' : 'score-loss'}">${b.you} km</span>
        <span class="score-sep">vs</span>
        <span>${b.rival} km</span>
      </div>
      <div class="battle-hist-week">Wk ${b.week}</div>
    </div>`).join('');
}

// ── INIT ──────────────────────────────────────────────────────────────────────
export function initBattles() {
  qs('#btn-battle-sync')?.addEventListener('click', () => {
    toast('Syncing battle data… 🔄');
    import('./strava.js').then(({ syncActivities }) => syncActivities());
  });
  qs('#btn-find-battle')?.addEventListener('click', () => {
    toast('Finding your rival… ⚔️');
    state.activeBattle = getMockBattle();
    state.rival        = getMockRival();
    renderBattleScreen();
  });
  qs('#btn-rematch')?.addEventListener('click', () => {
    toast('Rematch request sent! 🔥');
  });
}
