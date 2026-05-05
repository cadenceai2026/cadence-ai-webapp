import { supabase } from './supabase-client.js';
import { state } from './state.js';
import { qs, toast, esc } from './utils.js';

export function initGroups() {
  qs('#btn-create-group')?.addEventListener('click', () => {
    qs('#group-modal').style.display = 'flex';
  });

  qs('#btn-cancel-group')?.addEventListener('click', () => {
    qs('#group-modal').style.display = 'none';
  });

  qs('#btn-save-group')?.addEventListener('click', createGroup);
}

export async function loadGroups() {
  const container = qs('#groups-list');
  if (!container) return;
  container.innerHTML = '<div class="empty"><span class="spinner"></span> Loading…</div>';

  const { data: groups, error } = await supabase
    .from('groups')
    .select('*, group_members(count)')
    .order('created_at', { ascending: false });

  if (error) {
    container.innerHTML = '<div class="empty">Failed to load groups.</div>';
    return;
  }

  let myGroupIds = new Set();
  if (state.user) {
    const { data: memberships } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', state.user.id);
    myGroupIds = new Set((memberships || []).map(m => m.group_id));
  }

  if (!groups || !groups.length) {
    container.innerHTML = '<div class="empty">No groups yet. Create the first one! 🏃</div>';
    return;
  }

  container.innerHTML = groups.map(g => {
    const count = g.group_members?.[0]?.count || 0;
    const joined = myGroupIds.has(g.id);
    const pct = Math.min(100, count * 5);

    return `
      <div class="group-card">
        <div style="font-size:1.4rem;margin-bottom:10px">${g.flag || '🌍'}</div>
        <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:1.05rem;margin-bottom:4px">${esc(g.name)}</div>
        <div style="font-size:0.78rem;color:var(--muted);margin-bottom:14px">${g.city || ''} · ${count} members</div>
        <div class="group-bar-bg"><div class="group-bar-fg" style="width:${pct}%"></div></div>
        <button
          class="btn-join ${joined ? 'joined' : 'open'}"
          data-group-id="${g.id}"
          onclick="toggleJoin(this,'${g.id}')">
          ${joined ? '✓ Joined' : 'Join group'}
        </button>
      </div>`;
  }).join('');
}

async function createGroup() {
  if (!state.user) return toast('Sign in first', 'error');

  const name = qs('#group-name')?.value.trim();
  const city = qs('#group-city')?.value.trim();
  const flag = qs('#group-flag')?.value.trim();

  if (!name) return toast('Group name is required', 'error');

  const { error } = await supabase
    .from('groups')
    .insert({ name, city, flag, created_by: state.user.id });

  if (error) return toast(error.message, 'error');

  ['group-name', 'group-city', 'group-flag']
    .forEach(id => { const el = qs(`#${id}`); if (el) el.value = ''; });

  qs('#group-modal').style.display = 'none';
  toast('Group created! 🎉');
  loadGroups();
}

// Global so onclick in HTML can call it
window.toggleJoin = async function(btn, groupId) {
  if (!state.user) return toast('Sign in to join groups', 'error');

  const joined = btn.classList.contains('joined');

  if (joined) {
    await supabase.from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', state.user.id);
    btn.className = 'btn-join open';
    btn.textContent = 'Join group';
  } else {
    await supabase.from('group_members')
      .insert({ group_id: groupId, user_id: state.user.id });
    btn.className = 'btn-join joined';
    btn.textContent = '✓ Joined';
    toast('Joined! You\'re now competing 🔥');
  }
};
