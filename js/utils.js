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

window.toast = toast;

// ── CONFETTI ANIMATION ────────────────────────────────────────────────────────
export function fireConfetti() {
  const count = 50;
  const colors = ['#39FF14', '#ffffff', '#FFD700', '#FF4444'];
  
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.style.position = 'fixed';
    el.style.left = '50%';
    el.style.top = '50%';
    el.style.width = '8px';
    el.style.height = '8px';
    el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    el.style.pointerEvents = 'none';
    el.style.zIndex = '9999';
    el.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
    
    // Random direction
    const angle = Math.random() * Math.PI * 2;
    const velocity = 50 + Math.random() * 100;
    const tx = Math.cos(angle) * velocity;
    const ty = Math.sin(angle) * velocity - 100; // slightly upwards
    
    el.animate([
      { transform: `translate(-50%, -50%) scale(1)`, opacity: 1 },
      { transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(0)`, opacity: 0 }
    ], {
      duration: 800 + Math.random() * 400,
      easing: 'cubic-bezier(.17,.89,.32,1.28)'
    });
    
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }
}
