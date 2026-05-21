/**
 * challenges.js — Daily & weekly auto-generated challenges with real DB persistence.
 */
import { supabase } from './supabase-client.js';
import { state } from './state.js';
import { qs, toast, fireConfetti } from './utils.js';
import { awardXP, getWeeklyKmFromActivities } from './game.js';

// ── CHALLENGE TEMPLATES (used to auto-generate) ──────────────────────────────
const DAILY_TEMPLATES = [
  { title: 'Run 3 km today',    target_km: 3,  xp_reward: 50  },
  { title: 'Run 5 km today',    target_km: 5,  xp_reward: 80  },
  { title: 'Run 2 km today',    target_km: 2,  xp_reward: 30  },
];

const WEEKLY_TEMPLATES = [
  { title: 'Log 3 runs this week',   target_count: 3,  xp_reward: 100 },
  { title: 'Cover 20 km this week',  target_km: 20,    xp_reward: 150 },
  { title: 'Cover 10 km this week',  target_km: 10,    xp_reward: 80  },
  { title: 'Log 5 runs this week',   target_count: 5,  xp_reward: 200 },
];

// ── LOAD CHALLENGES FROM DB ──────────────────────────────────────────────────
async function loadChallengeData() {
  if (!state.user) {
    state.challenges = [];
    return;
  }

  try {
    const now = new Date().toISOString();

    // Fetch active (non-expired) challenges
    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .eq('user_id', state.user.id)
      .gte('expires_at', now)
      .order('type', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('loadChallengeData error:', error);
      state.challenges = [];
      return;
    }

    state.challenges = data || [];

    // If no challenges exist for today/this week, auto-generate them
    const hasDaily = state.challenges.some(c => c.type === 'daily');
    const hasWeekly = state.challenges.some(c => c.type === 'weekly');

    const newChallenges = [];

    if (!hasDaily) {
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 0);
      const template = DAILY_TEMPLATES[Math.floor(Math.random() * DAILY_TEMPLATES.length)];
      newChallenges.push({
        user_id: state.user.id,
        type: 'daily',
        title: template.title,
        target_km: template.target_km || null,
        target_count: template.target_count || null,
        xp_reward: template.xp_reward,
        current_value: 0,
        expires_at: endOfDay.toISOString(),
      });
    }

    if (!hasWeekly) {
      const nextMonday = new Date();
      const daysUntilMon = (8 - nextMonday.getDay()) % 7 || 7;
      nextMonday.setDate(nextMonday.getDate() + daysUntilMon);
      nextMonday.setHours(0, 0, 0, 0);

      // Generate 2 weekly challenges
      const shuffled = [...WEEKLY_TEMPLATES].sort(() => Math.random() - 0.5);
      for (let i = 0; i < 2 && i < shuffled.length; i++) {
        const t = shuffled[i];
        newChallenges.push({
          user_id: state.user.id,
          type: 'weekly',
          title: t.title,
          target_km: t.target_km || null,
          target_count: t.target_count || null,
          xp_reward: t.xp_reward,
          current_value: 0,
          expires_at: nextMonday.toISOString(),
        });
      }
    }

    if (newChallenges.length > 0) {
      const { data: inserted, error: insertErr } = await supabase
        .from('challenges')
        .insert(newChallenges)
        .select();

      if (insertErr) {
        console.error('auto-generate challenges error:', insertErr);
      } else if (inserted) {
        state.challenges = [...state.challenges, ...inserted];
      }
    }

    // Update current_value for km-based challenges from real activities
    await updateChallengeProgressFromActivities();

  } catch (err) {
    console.error('loadChallengeData unexpected:', err);
    state.challenges = [];
  }
}

// ── UPDATE PROGRESS FROM REAL ACTIVITIES ──────────────────────────────────────
async function updateChallengeProgressFromActivities() {
  if (!state.user || !state.challenges.length) return;

  const weeklyKm = getWeeklyKmFromActivities();
  const now = Date.now();
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);

  // Daily km
  const todayKm = (state.activities || [])
    .filter(a => {
      const d = new Date(a.start_date_local || a.start_date);
      return d >= dayStart && (a.sport_type === 'Run' || a.sport_type === 'TrailRun');
    })
    .reduce((sum, a) => sum + (a.distance || 0) / 1000, 0);

  // Weekly run count
  const week = 7 * 24 * 3600 * 1000;
  const weeklyRunCount = (state.activities || [])
    .filter(a => {
      const d = new Date(a.start_date_local || a.start_date);
      return (now - d.getTime()) < week &&
             (a.sport_type === 'Run' || a.sport_type === 'TrailRun');
    })
    .length;

  const updates = [];

  for (const ch of state.challenges) {
    if (ch.completed) continue;

    let newValue = ch.current_value;

    if (ch.type === 'daily' && ch.target_km) {
      newValue = Math.min(ch.target_km, parseFloat(todayKm.toFixed(1)));
    } else if (ch.type === 'weekly' && ch.target_km) {
      newValue = Math.min(ch.target_km, parseFloat(weeklyKm.toFixed(1)));
    } else if (ch.type === 'weekly' && ch.target_count) {
      newValue = Math.min(ch.target_count, weeklyRunCount);
    }

    if (newValue !== ch.current_value) {
      ch.current_value = newValue;
      updates.push(
        supabase
          .from('challenges')
          .update({ current_value: newValue })
          .eq('id', ch.id)
      );
    }
  }

  if (updates.length > 0) {
    await Promise.all(updates);
  }
}

// ── PROGRESS CALCULATION ──────────────────────────────────────────────────────
function getProgress(ch) {
  const target = ch.target_km || ch.target_count || ch.target_days || 1;
  const pct    = Math.min(100, (ch.current_value / target) * 100);
  return { target, pct };
}

function formatValue(ch) {
  if (ch.target_km)    return `${parseFloat(ch.current_value).toFixed(1)} / ${ch.target_km} km`;
  if (ch.target_count) return `${ch.current_value} / ${ch.target_count} runs`;
  if (ch.target_days)  return `${ch.current_value} / ${ch.target_days} days`;
  return ch.current_value;
}

function timeUntil(dateStr) {
  const diff = new Date(dateStr) - Date.now();
  if (diff <= 0) return 'Expired';
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h left`;
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m left`;
}

// ── RENDER ────────────────────────────────────────────────────────────────────
export async function renderChallenges() {
  await loadChallengeData();

  const daily   = state.challenges.filter(c => c.type === 'daily');
  const weekly  = state.challenges.filter(c => c.type === 'weekly');

  renderChallengeSection('#challenges-daily', daily, 'DAILY');
  renderChallengeSection('#challenges-weekly', weekly, 'WEEKLY');
}

function renderChallengeSection(selector, list, label) {
  const el = qs(selector);
  if (!el) return;

  if (!list.length) {
    el.innerHTML = `<div class="empty" style="padding:16px 0">No ${label.toLowerCase()} challenges active.</div>`;
    return;
  }

  el.innerHTML = list.map((ch, i) => {
    const { target, pct } = getProgress(ch);
    const done  = ch.completed;
    const value = formatValue(ch);
    const time  = timeUntil(ch.expires_at);

    return `
      <div class="challenge-card ${done ? 'challenge-done' : ''}" id="ch-card-${ch.id}">
        <div class="challenge-top">
          <div class="challenge-meta-row">
            <span class="challenge-type-badge ${ch.type}">${label}</span>
            <span class="challenge-timer">${done ? '✅ Complete' : time}</span>
          </div>
          <div class="challenge-title">${ch.title}</div>
        </div>
        <div class="challenge-progress-wrap">
          <div class="challenge-bar-bg">
            <div class="challenge-bar-fill" id="ch-fill-${ch.id}" 
                 style="width:0%;background:${done ? 'var(--green)' : pct >= 80 ? '#f59e0b' : 'var(--green)'}">
            </div>
          </div>
          <div class="challenge-progress-labels">
            <span class="challenge-value">${value}</span>
            <span class="challenge-xp">+${ch.xp_reward} XP</span>
          </div>
        </div>
        ${done ? '' : `
          <button class="challenge-claim-btn" onclick="claimChallenge('${ch.id}')">
            ${pct >= 100 ? '🎉 Claim Reward' : `${Math.round(pct)}% complete`}
          </button>`}
      </div>`;
  }).join('');

  // Animate progress bars
  requestAnimationFrame(() => {
    setTimeout(() => {
      list.forEach(ch => {
        const fill = qs(`#ch-fill-${ch.id}`);
        if (fill) fill.style.width = `${Math.min(100, getProgress(ch).pct)}%`;
      });
    }, 120);
  });
}

// ── CLAIM CHALLENGE (persisted to DB) ─────────────────────────────────────────
window.claimChallenge = async function(id) {
  const ch = state.challenges.find(c => c.id === id);
  if (!ch) return;
  const { pct } = getProgress(ch);
  if (pct < 100) { toast('Keep running — not done yet! 🏃', 'error'); return; }
  if (ch.completed) { toast('Already claimed!'); return; }

  ch.completed    = true;
  ch.completed_at = new Date().toISOString();

  // Persist to DB
  if (state.user) {
    await supabase
      .from('challenges')
      .update({ completed: true, completed_at: ch.completed_at })
      .eq('id', ch.id);
  }

  await awardXP(ch.xp_reward, ch.title);
  toast(`🎉 Challenge complete! +${ch.xp_reward} XP`);
  fireConfetti();

  // Refresh UI
  const card = qs(`#ch-card-${id}`);
  if (card) {
    card.classList.add('challenge-done');
    const btn = card.querySelector('.challenge-claim-btn');
    if (btn) btn.outerHTML = '<div class="challenge-claimed">✅ Claimed</div>';
  }
};

// ── UPDATE CHALLENGE PROGRESS (called after activity sync) ────────────────────
export async function updateChallengeProgress() {
  await updateChallengeProgressFromActivities();
  if (state.currentPage === 'challenges') {
    renderChallenges();
  }
}

// ── INIT ──────────────────────────────────────────────────────────────────────
export function initChallenges() {
  // Challenges auto-refresh every 60s during the session
  setInterval(() => {
    if (state.currentPage === 'challenges') renderChallenges();
  }, 60000);
}
