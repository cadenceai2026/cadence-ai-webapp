import { supabase } from './supabase-client.js';
import { state } from './state.js';
import { qs, toast } from './utils.js';
import { CONFIG } from './config.js';

export async function loadAdminData() {
  if (!state.user || state.user.email !== CONFIG.adminEmail) return;

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) { toast('Failed to load admin data', 'error'); return; }

  const elite = profiles.filter(p => p.plan === 'elite').length;
  const trial = profiles.filter(p => p.plan === 'trial').length;
  const free  = profiles.filter(p => p.plan === 'free').length;

  const set = (id, val) => { const el = qs(`#${id}`); if (el) el.textContent = val; };
  set('admin-total', profiles.length);
  set('admin-elite', elite);
  set('admin-trial', trial);
  set('admin-free',  free);

  const tbody = qs('#admin-tbody');
  if (!tbody) return;

  tbody.innerHTML = profiles.map(p => `
    <tr>
      <td>${p.email || '—'}</td>
      <td><span class="plan-tag ${p.plan}">${p.plan}</span></td>
      <td style="color:var(--muted);font-size:0.78rem">
        ${p.trial_ends_at ? new Date(p.trial_ends_at).toLocaleDateString() : '—'}
      </td>
      <td style="color:var(--muted);font-size:0.78rem">
        ${p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
      </td>
      <td>${p.city || '—'}</td>
    </tr>`).join('');
}
