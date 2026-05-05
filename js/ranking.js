import { supabase } from './supabase-client.js';
import { state } from './state.js';
import { qs } from './utils.js';

export async function loadRanking() {
  const container = qs('#ranking-list');
  if (!container) return;
  container.innerHTML = '<div class="empty"><span class="spinner"></span> Loading…</div>';

  // Days left this month
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysLeft = Math.ceil((lastDay - now) / 86400000);
  const daysEl = qs('#days-left');
  if (daysEl) daysEl.textContent = daysLeft;

  // Activities this month
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data, error } = await supabase
    .from('activities')
    .select('user_id, distance, profiles(display_name, email, avatar_url)')
    .gte('start_date', firstOfMonth)
    .eq('sport_type', 'Run');

  if (error || !data?.length) {
    container.innerHTML = '<div class="empty">No runs this month yet. Be the first! 🏃</div>';
    return;
  }

  // Aggregate km per user
  const totals = {};
  data.forEach(a => {
    const uid = a.user_id;
    const profile = a.profiles;
    const name = profile?.display_name || profile?.email?.split('@')[0] || 'Runner';
    if (!totals[uid]) totals[uid] = { name, km: 0 };
    totals[uid].km += (a.distance || 0) / 1000;
  });

  const sorted = Object.entries(totals)
    .sort((a, b) => b[1].km - a[1].km)
    .slice(0, 20);

  const medals = ['🥇', '🥈', '🥉'];

  container.innerHTML = `
    <div class="ranking-card">
      <div class="ranking-header">
        <div style="font-family:'DM Mono',monospace;font-size:0.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em">
          Monthly km ranking
        </div>
        <div style="font-size:0.78rem;color:var(--green);font-family:'DM Mono',monospace">
          🏆 Winner gets free Elite month
        </div>
      </div>
      ${sorted.map(([uid, d], i) => {
        const isMe = uid === state.user?.id;
        return `
          <div class="ranking-row ${i === 0 ? 'top' : ''}" style="${isMe ? 'background:var(--green-dim)' : ''}">
            <div class="rank-num ${i === 0 ? 'gold' : ''}">${medals[i] || i + 1}</div>
            <div class="rank-av">${d.name[0].toUpperCase()}</div>
            <div class="rank-name">${d.name}${isMe ? ' (you)' : ''}</div>
            <div class="rank-km">${d.km.toFixed(1)} km</div>
            ${i === 0 ? '<div class="trophy">🏆</div>' : ''}
          </div>`;
      }).join('')}
    </div>`;
}
