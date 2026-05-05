// js/ui.js

export function showAuthScreen() {
  const auth = document.getElementById('screen-auth');
  const app = document.getElementById('screen-app');

  if (!auth || !app) {
    console.warn('[UI] Auth/App containers not found');
    return;
  }

  auth.style.display = 'block';
  app.style.display = 'none';
}

export function showAppScreen() {
  const auth = document.getElementById('screen-auth');
  const app = document.getElementById('screen-app');

  if (!auth || !app) {
    console.warn('[UI] Auth/App containers not found');
    return;
  }

  auth.style.display = 'none';
  app.style.display = 'block';
}
