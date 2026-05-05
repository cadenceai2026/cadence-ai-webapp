export function qs(selector) {
  return document.querySelector(selector);
}

export function qsa(selector) {
  return document.querySelectorAll(selector);
}

export function show(el) {
  if (el) el.classList.remove('hidden');
}

export function hide(el) {
  if (el) el.classList.add('hidden');
}

export function toast(message, type = 'success') {
  const root = document.getElementById('toast-root');
  if (!root) return;
  const div = document.createElement('div');
  div.className = `toast toast-${type}`;
  div.textContent = message;
  root.appendChild(div);
  setTimeout(() => div.remove(), 3500);
}

export function fmtTime(seconds) {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

export function fmtPace(secondsPerKm) {
  if (!secondsPerKm || !isFinite(secondsPerKm)) return '—';
  const m = Math.floor(secondsPerKm / 60);
  const s = Math.round(secondsPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function fmtDist(meters) {
  return (meters / 1000).toFixed(2);
}

export function typeIcon(type) {
  const icons = {
    Run: '🏃', Ride: '🚴', Swim: '🏊', Walk: '🚶',
    Hike: '🥾', WeightTraining: '🏋️', Yoga: '🧘',
    TrailRun: '🏔️', VirtualRide: '🖥️', Workout: '💪'
  };
  return icons[type] || '⚡';
}

export function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function daysUntil(dateStr) {
  if (!dateStr) return 0;
  return Math.max(0, Math.ceil((new Date(dateStr) - Date.now()) / 86400000));
}
