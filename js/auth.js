// js/main.js
import { initAuth } from './auth.js';
import { initRouter } from './router.js';
import { showAuthScreen } from './ui.js';
import { state } from './state.js';

document.addEventListener('DOMContentLoaded', () => {
  console.log('[Cadence] Booting app');

  initAuth();
  initRouter();

  // Estado inicial
  if (state.user) {
    showAppScreen();
  } else {
    showAuthScreen();
  }
});
