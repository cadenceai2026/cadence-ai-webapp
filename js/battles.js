/**
 * battles.js — 1v1 km battle screen with real DB persistence.
 */
import { supabase } from './supabase-client.js';
import { state } from './state.js';
import { qs, toast } from './utils.js';
import { getWeeklyKmFromActivities } from './game.js';
import { ensureBotRival } from './mockData.js';

// ── LOAD DATA FROM DB ─────────────────────────────────────────────────────────
async function loadBattleData() {
  if (!state.user) {
    state.activeBattle = null;
    state.rival = null;
    return;
  }

  try {
    // Fetch active battle
    const { data: battle, error } = await supabase
      .from('battles')
      .select('*')
      .or(`challenger_id.eq.${state.user.id},opponent_id.eq.${state.user.id}`)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('loadBattleData error:', error);
      state.activeBattle = null;
      state.rival = null;
      return;
    }

    if (battle) {
      // Update challenger_km with real weekly km if user is challenger
      const weeklyKm = getWeeklyKmFromActivities();
      if (battle.challenger_id === state.user.id) {
        battle.challenger_km = weeklyKm.toFixed(2);
      } else {
        battle.opponent_km = weeklyKm.toFixed(2);
      }

      // Persist updated km
      const updateField = battle.challenger_id === state.user.id
        ? { challenger_km: weeklyKm.toFixed(2) }
        : { opponent_km: weeklyKm.toFixed(2) };
      await supabase.from('battles').update(updateField).eq('id', battle.id);

      // Normalize so "you" is always challenger side in UI
      if (battle.opponent_id === state.user.id) {
        // Swap sides for UI
        state.activeBattle = {
          ...battle,
          challenger_km: battle.opponent_km,
          opponent_km: battle.challenger_km,
          challenger_name: state.profile?.display_name || 'You',
          opponent_name: battle._opponent_name || 'Rival',
        };
      } else {
        state.activeBattle = {
          ...battle,
          challenger_name: state.profile?.display_name || 'You',
        };
      }

      // Load rival profile
      const rivalId = battle.challenger_id === state.user.id
        ? battle.opponent_id
        : battle.challenger_id;

      const { data: rivalProfile } = await supabase
        .from('profiles')
        .select('id, display_name')
        .eq('id', rivalId)
        .maybeSingle();

      const { data: rivalGame } = await supabase
        .from('game_profiles')
        .select('level, league, weekly_km, battles_won, battles_lost')
        .eq('user_id', rivalId)
        .maybeSingle();

      state.rival = {
        id: rivalId,
        display_name: rivalProfile?.display_name || 'Rival',
        level: rivalGame?.level || 1,
        league: rivalGame?.league || 'bronze',
        weekly_km: parseFloat(rivalGame?.weekly_km) || 0,
        avatar_initial: (rivalProfile?.display_name || 'R')[0].toUpperCase(),
        battles_won: rivalGame?.battles_won || 0,
        battles_lost: rivalGame?.battles_lost || 0,
      };

      // Update opponent name in active battle
      state.activeBattle.opponent_name = state.rival.display_name;

    } else {
      state.activeBattle = null;
      state.rival = null;
    }

  } catch (err) {
    console.error('loadBattleData unexpected:', err);
    state.activeBattle = null;
    state.rival = null;
  }
}

// ── FIND RIVAL & CREATE BATTLE ────────────────────────────────────────────────
async function findRivalAndCreateBattle() {
  if (!state.user) return;

  toast('Finding your rival… ⚔️');

  const myLeague = state.gameProfile?.league || 'bronze';

  // Find another user in the same league (not self)
  const { data: candidates } = await supabase
    .from('game_profiles')
    .select('user_id')
    .eq('league', myLeague)
    .neq('user_id', state.user.id)
    .limit(10);

  let opponentId;

  if (candidates && candidates.length > 0) {
    // Pick a random real opponent
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    opponentId = pick.user_id;
    
    const now = new Date();
    const weekNumber = Math.ceil((now - new Date(now.getFullYear(), 0, 1)) / (7 * 86400000));
    const endDate = new Date(now.getTime() + 7 * 86400000);

    const { data: battle, error } = await supabase
      .from('battles')
      .insert({
        challenger_id: state.user.id,
        opponent_id: opponentId,
        challenger_km: getWeeklyKmFromActivities().toFixed(2),
        opponent_km: 0,
        status: 'active',
        battle_type: 'weekly_km',
        title: 'Weekly Battle',
        week_number: weekNumber,
        end_date: endDate.toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('createBattle error:', error);
      toast('Failed to create battle', 'error');
      return;
    }
  } else {
    // No other users — rely on the mock data engine to create a bot battle
    await ensureBotRival(state.user.id);
  }

  toast('Battle started! Let the km war begin ⚔️🔥');
  await renderBattleScreen();
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
    renderBattleHistory();
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

  // Status message (Emotional layer)
  const msgEl = qs('#battle-message');
  if (msgEl) {
    const diffAbs = Math.abs(diffKm);
    const isClose = diffAbs <= 1.0 && !tied;
    
    if (winning) {
      if (isClose) {
        msgEl.innerHTML = `⚡ <strong>Tight race!</strong> You're only ahead by ${diffAbs} km. Don't slow down!`;
      } else {
        msgEl.innerHTML = `🔥 <strong>YOU TOOK THE LEAD!</strong> Keep crushing it, ${diffAbs} km ahead!`;
      }
    } else if (tied) {
      msgEl.innerHTML = `🤝 <strong>Dead heat!</strong> It's a perfect tie. The next run decides it.`;
    } else {
      if (isClose) {
        msgEl.innerHTML = `⚡ <strong>Tight race!</strong> You're only losing by ${diffAbs} km. You can win this!`;
      } else {
        msgEl.innerHTML = `⚠️ <strong>You're behind.</strong> Trailing by ${diffAbs} km — time to lace up and run!`;
      }
    }
    msgEl.className = `battle-message ${winning ? 'winning' : tied ? 'tied' : 'losing'}`;
  }

  // Render history
  await renderBattleHistory();
  
  // Setup real-time updates
  setupBattleSubscription();
}

let battleSub = null;
function setupBattleSubscription() {
  if (!state.activeBattle || battleSub) return;
  
  battleSub = supabase
    .channel('realtime-battles')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'battles', filter: `id=eq.${state.activeBattle.id}` }, payload => {
      const oldYou = parseFloat(state.activeBattle.challenger_km);
      const oldRiv = parseFloat(state.activeBattle.opponent_km);
      const wasBehind = oldYou < oldRiv;
      const wasTied = oldYou === oldRiv;
      
      // Update state
      if (payload.new.challenger_id === state.user.id) {
         state.activeBattle.challenger_km = payload.new.challenger_km;
         state.activeBattle.opponent_km = payload.new.opponent_km;
      } else {
         state.activeBattle.challenger_km = payload.new.opponent_km;
         state.activeBattle.opponent_km = payload.new.challenger_km;
      }
      
      const newYou = parseFloat(state.activeBattle.challenger_km);
      const newRiv = parseFloat(state.activeBattle.opponent_km);
      const isAhead = newYou > newRiv;
      
      if (wasBehind && isAhead) {
        toast('🔥 YOU TOOK THE LEAD!');
      } else if (!wasBehind && !isAhead && !wasTied) {
        toast('⚠️ You lost the lead!');
      } else if (Math.abs(newYou - newRiv) < 1.0 && newYou !== newRiv) {
        toast('⚡ Tight race! Less than 1km difference.');
      }
      
      renderBattleScreen();
    })
    .subscribe();
}

// ── BATTLE HISTORY FROM DB ────────────────────────────────────────────────────
async function renderBattleHistory() {
  const el = qs('#battle-history');
  if (!el) return;

  if (!state.user) {
    el.innerHTML = '<div class="empty" style="padding:24px 0">No past battles yet — keep competing!</div>';
    return;
  }

  try {
    const { data: pastBattles, error } = await supabase
      .from('battles')
      .select('*')
      .or(`challenger_id.eq.${state.user.id},opponent_id.eq.${state.user.id}`)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error || !pastBattles || pastBattles.length === 0) {
      el.innerHTML = '<div class="empty" style="padding:24px 0">No past battles yet — keep competing!</div>';
      return;
    }

    // Fetch opponent names
    const opponentIds = pastBattles.map(b =>
      b.challenger_id === state.user.id ? b.opponent_id : b.challenger_id
    );
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', [...new Set(opponentIds)]);

    const nameMap = {};
    (profiles || []).forEach(p => { nameMap[p.id] = p.display_name; });

    const history = pastBattles.map(b => {
      const isChallenger = b.challenger_id === state.user.id;
      const oppId = isChallenger ? b.opponent_id : b.challenger_id;
      return {
        week: b.week_number,
        opponent: nameMap[oppId] || 'Rival',
        you: isChallenger ? parseFloat(b.challenger_km) : parseFloat(b.opponent_km),
        rival: isChallenger ? parseFloat(b.opponent_km) : parseFloat(b.challenger_km),
        won: b.winner_id === state.user.id,
      };
    });

    el.innerHTML = history.map(b => `
      <div class="battle-hist-row ${b.won ? 'won' : 'lost'}">
        <div class="battle-hist-badge">${b.won ? '🏆 WIN' : '💀 LOSS'}</div>
        <div class="battle-hist-opp">vs ${b.opponent}</div>
        <div class="battle-hist-score">
          <span class="${b.won ? 'score-win' : 'score-loss'}">${b.you.toFixed(1)} km</span>
          <span class="score-sep">vs</span>
          <span>${b.rival.toFixed(1)} km</span>
        </div>
        <div class="battle-hist-week">Wk ${b.week}</div>
      </div>`).join('');

  } catch (err) {
    console.error('renderBattleHistory error:', err);
    el.innerHTML = '<div class="empty" style="padding:24px 0">No past battles yet — keep competing!</div>';
  }
}

// ── INIT ──────────────────────────────────────────────────────────────────────
export function initBattles() {
  qs('#btn-battle-sync')?.addEventListener('click', () => {
    toast('Syncing battle data… 🔄');
    import('./strava.js').then(({ syncActivities }) => syncActivities());
  });
  qs('#btn-find-battle')?.addEventListener('click', () => {
    findRivalAndCreateBattle();
  });
  qs('#btn-rematch')?.addEventListener('click', async () => {
    // End current battle and start a new one
    if (state.activeBattle?.id) {
      await supabase.from('battles').update({ status: 'completed' }).eq('id', state.activeBattle.id);
    }
    findRivalAndCreateBattle();
  });
}
