// js/auth.js
import { showAppScreen, showAuthScreen } from './ui.js';
import { state } from './state.js';

export function initAuth() {
  const btnSignin = document.getElementById('btn-signin');
  const btnSignup = document.getElementById('btn-signup');
  const btnSignout = document.getElementById('btn-signout');

  // LOGIN
  btnSignin?.addEventListener('click', () => {
    state.user = {
      id: 'demo',
      email: document.getElementById('si-email')?.value || 'demo@cadence.ai',
      display_name: 'Runner',
      plan: 'TRIAL'
    };

    hydrateUser();
    showAppScreen();
  });

  // SIGNUP
  btnSignup?.addEventListener('click', () => {
    state.user = {
      id: 'demo',
      email: document.getElementById('su-email')?.value || 'demo@cadence.ai',
      display_name: 'New Runner',
      plan: 'TRIAL'
    };

    hydrateUser();
    showAppScreen();
  });

  // LOGOUT
  btnSignout?.addEventListener('click', () => {
    state.user = null;
    showAuthScreen();
  });
}

function hydrateUser() {
  if (!state.user) return;

  document.getElementById('sb-name').textContent = state.user.display_name;
  document.getElementById('account-email').textContent = state.user.email;
  document.getElementById('welcome-name').textContent =
    `Welcome back 👋`;
}
