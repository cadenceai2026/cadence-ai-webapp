import { supabase } from './supabase-client.js';
import { state } from './state.js';
import { qs, toast } from './utils.js';

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

  const token = state.session?.access_token;
  if (!token) { toast('Session expired — please sign in again', 'error'); return; }

  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: { email: state.user.email },
    headers: { Authorization: `Bearer ${token}` }
  });

  if (error || !data?.url) {
    toast('Could not start checkout', 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Start free trial →'; }
    return;
  }

  window.location.href = data.url;
}
