/**
 * battlepass.js — Season pass: 50-level reward track with free/premium tiers.
 */
import { state } from './state.js';
import { qs, toast } from './utils.js';
import { getMockBattlePass, xpProgressInLevel, xpNeededForNextLevel } from './game.js';

// ── REWARD DEFINITIONS (levels with special rewards) ─────────────────────────
const REWARDS = {
  5:  { emoji: '🥉', title: 'Bronze Badge',      premium: false },
  10: { emoji: '⚡', title: '2× XP Boost (24h)', premium: true  },
  15: { emoji: '🥈', title: 'Silver Badge',       premium: false },
  20: { emoji: '🔥', title: 'Streak Shield',      premium: true  },
  25: { emoji: '🥇', title: 'Gold Badge',          premium: false },
  30: { emoji: '💜', title: 'Elite Frame',         premium: true  },
  35: { emoji: '🎯', title: 'Custom Title',        premium: false },
  40: { emoji: '🌟', title: 'Prestige Badge',      premium: true  },
  45: { emoji: '🎖️', title: 'Hall of Fame',        premium: false },
  50: { emoji: '👑', title: 'Season Champion',     premium: true  },
};

function getRewardForLevel(lvl) {
  return REWARDS[lvl] || null;
}

// ── LOAD BATTLE PASS ──────────────────────────────────────────────────────────
async function loadBattlePassData() {
  if (state.battlePass) return;
  state.battlePass = getMockBattlePass();
}

// ── RENDER SEASON PASS ────────────────────────────────────────────────────────
export async function renderBattlePass() {
  await loadBattlePassData();

  const bp       = state.battlePass;
  const season   = bp.season;
  const progress = bp.progress;
  const totalLvl = season.total_levels || 50;
  const curLvl   = progress.current_level || 1;
  const curXP    = progress.current_xp || 0;
  const claimed  = new Set(progress.claimed_levels || []);
  const isPremium = progress.is_premium;

  // Header
  const hdrEl = qs('#bp-header');
  if (hdrEl) {
    const end    = new Date(season.end_date);
    const dLeft  = Math.max(0, Math.ceil((end - Date.now()) / 86400000));
    hdrEl.innerHTML = `
      <div class="bp-season-name">${season.name}</div>
      <div class="bp-season-meta">${dLeft} days remaining · ${totalLvl} levels</div>`;
  }

  // Season XP bar
  const xpEl = qs('#bp-xp-bar');
  if (xpEl && state.gameProfile) {
    const gp    = state.gameProfile;
    const prog  = xpProgressInLevel(gp.total_xp);
    const need  = xpNeededForNextLevel(gp.total_xp);
    const pct   = Math.min(100, (prog / need) * 100);
    xpEl.innerHTML = `
      <div class="bp-xp-labels">
        <span>Level ${gp.level}</span>
        <span>${prog} / ${need} XP</span>
      </div>
      <div class="xp-track">
        <div class="xp-fill" id="bp-xp-fill" style="width:0%"></div>
      </div>`;
    requestAnimationFrame(() => {
      setTimeout(() => {
        const fill = qs('#bp-xp-fill');
        if (fill) fill.style.width = `${pct}%`;
      }, 100);
    });
  }

  // Premium upsell (if not premium)
  const upsellEl = qs('#bp-upsell');
  if (upsellEl) {
    upsellEl.style.display = isPremium ? 'none' : 'flex';
  }

  // Track nodes
  const trackEl = qs('#bp-track');
  if (!trackEl) return;

  const nodes = [];
  for (let lvl = 1; lvl <= totalLvl; lvl++) {
    const reward    = getRewardForLevel(lvl);
    const isDone    = lvl < curLvl || claimed.has(lvl);
    const isCurrent = lvl === curLvl;
    const isLocked  = lvl > curLvl;
    const isPremR   = reward?.premium && !isPremium;

    let stateClass = isDone ? 'bp-node-done' : isCurrent ? 'bp-node-current' : 'bp-node-locked';

    nodes.push(`
      <div class="bp-node-wrap">
        <div class="bp-node ${stateClass} ${reward ? 'bp-node-reward' : ''}"
             data-lvl="${lvl}"
             onclick="claimPassReward(${lvl})">
          ${isDone ? '<span class="bp-node-check">✓</span>' :
            reward ? `<span class="bp-node-emoji">${reward.emoji}</span>` :
            `<span class="bp-node-num">${lvl}</span>`}
        </div>
        ${reward ? `
          <div class="bp-reward-tag ${isPremR ? 'bp-reward-premium' : ''}">
            ${isPremR ? '🔒 ' : ''}${reward.title}
          </div>` : ''}
        ${isCurrent ? '<div class="bp-you-marker">YOU</div>' : ''}
      </div>`);
  }

  trackEl.innerHTML = nodes.join('');

  // Scroll current level into view
  setTimeout(() => {
    const curNode = trackEl.querySelector('.bp-node-current');
    if (curNode) curNode.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, 300);
}

// ── CLAIM REWARD ──────────────────────────────────────────────────────────────
window.claimPassReward = function(level) {
  const bp      = state.battlePass;
  if (!bp) return;
  const curLvl  = bp.progress.current_level;
  const claimed = new Set(bp.progress.claimed_levels || []);
  const reward  = getRewardForLevel(level);

  if (level > curLvl) { toast('Reach this level first! 🔒', 'error'); return; }
  if (claimed.has(level)) { toast('Already claimed ✓'); return; }
  if (!reward) return;

  if (reward.premium && !bp.progress.is_premium) {
    toast('Upgrade to Elite to unlock premium rewards 👑', 'error');
    return;
  }

  bp.progress.claimed_levels = [...bp.progress.claimed_levels, level];
  toast(`${reward.emoji} Claimed: ${reward.title}!`);
  showRewardModal(reward);
  renderBattlePass();
};

function showRewardModal(reward) {
  const modal = qs('#reward-modal');
  if (!modal) return;
  const body = qs('#reward-modal-body');
  if (body) {
    body.innerHTML = `
      <div class="reward-modal-emoji">${reward.emoji}</div>
      <div class="reward-modal-title">${reward.title}</div>
      <div class="reward-modal-sub">Reward unlocked! 🎉</div>`;
  }
  modal.style.display = 'flex';
  setTimeout(() => modal.style.display = 'none', 2800);
}

// ── INIT ──────────────────────────────────────────────────────────────────────
export function initBattlePass() {
  qs('#btn-upgrade-pass')?.addEventListener('click', () => {
    import('./router.js').then(({ navigate }) => navigate('pricing'));
  });
}
