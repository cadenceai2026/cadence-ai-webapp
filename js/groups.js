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

    const joinedClass = joined 
      ? 'bg-surface-container border border-primary text-primary hover:bg-primary hover:text-on-primary' 
      : 'bg-primary text-on-primary hover:bg-primary-fixed';

    return `
      <div class="glass-panel border border-outline-variant/30 rounded-xl p-6 relative overflow-hidden group-card transition-colors hover:border-primary/50">
        <div class="absolute inset-0 bg-primary/5 opacity-0 hover:opacity-100 transition-opacity pointer-events-none"></div>
        <div class="relative z-10 flex justify-between items-start mb-6">
          <div class="w-12 h-12 rounded bg-surface-container border border-outline-variant/50 flex items-center justify-center text-[24px]">
            ${g.flag || '🌍'}
          </div>
          <button class="w-full max-w-[120px] py-2 rounded font-label-caps text-[10px] uppercase tracking-widest transition-colors ${joinedClass} joined-btn" data-group-id="${g.id}" onclick="toggleJoin(this,'${g.id}')">
            ${joined ? '✓ Joined' : 'Join Squad'}
          </button>
        </div>
        <div class="relative z-10 mb-4">
          <h3 class="font-headline-md text-neon-white text-[18px] uppercase tracking-wider mb-1">${esc(g.name)}</h3>
          <p class="font-label-caps text-on-surface-variant text-[10px] uppercase tracking-widest cursor-pointer hover:text-primary transition-colors" onclick="viewGroupMembers('${g.id}', '${esc(g.name)}')">${g.city || 'GLOBAL'} · ${count} MEMBERS (VIEW)</p>
        </div>
        <div class="relative z-10 w-full h-1 bg-surface-container-highest rounded overflow-hidden">
          <div class="h-full bg-primary" style="width:${pct}%"></div>
        </div>
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
    btn.classList.add('joined');
    btn.textContent = '✓ Joined';
    toast('Joined group! 🎉');
  }
};

window.viewGroupMembers = async function(groupId, groupName) {
  toast('Loading members...');
  const { data: members, error } = await supabase
    .from('group_members')
    .select('profiles(display_name, city)')
    .eq('group_id', groupId)
    .limit(10);
    
  if (error || !members) return toast('Failed to load members', 'error');
  if (members.length === 0) return toast('No members yet.');
  
  const names = members.map(m => m.profiles?.display_name || 'Runner').join(', ');
  toast(`Members of ${groupName}: ${names}`);
};
