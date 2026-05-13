import { supabase } from './supabase-client.js';
import { state } from './state.js';
import { qs, toast } from './utils.js';
import { CONFIG } from './config.js';

export function initBilling() {
  qs('#btn-checkout')?.addEventListener('click', startCheckout);
  qs('#upgrade-btn')?.addEventListener('click', startCheckout);
  qs('#mob-plan-badge')?.addEventListener('click', () => {
    if (state.profile?.plan !== 'elite') startCheckout();
  });
}

async function startCheckout() {
  if (!state.user) return toast('Sign in first', 'error');

  const btn = qs('#btn-checkout');
  if (btn) { btn.disabled = true; btn.textContent = 'Loading…'; }

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) { toast('Session expired — please sign in again', 'error'); return; }

  let resp, data;
  try {
    resp = await fetch(`${CONFIG.supabaseUrl}/functions/v1/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': CONFIG.supabaseAnonKey,
      },
      body: JSON.stringify({ email: state.user.email }),
    });
    data = await resp.json();
  } catch (e) {
    toast('Could not start checkout — network error', 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Start free trial →'; }
    return;
  }

  if (!resp.ok || !data?.url) {
    const detail = data?.error || `HTTP ${resp.status}`;
    toast(`Could not start checkout — ${detail}`, 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Start free trial →'; }
    return;
  }

  window.location.href = data.url;
}
