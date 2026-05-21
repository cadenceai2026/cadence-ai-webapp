const fs = require('fs');
let html = fs.readFileSync('app.html', 'utf8');

const newBottom = `  <!-- Mobile bottom nav -->
  <nav class="fixed bottom-0 w-full z-50 flex justify-around items-center px-4 pb-6 pt-2 md:hidden bg-surface-container-lowest/90 backdrop-blur-2xl rounded-t-xl shadow-[0_-4px_24px_rgba(0,0,0,0.8)] border-t-0">
    <button class="nav-item flex flex-col items-center justify-center text-primary-container drop-shadow-[0_0_8px_rgba(0,229,160,0.6)] scale-110 transition-transform duration-300 gap-1 w-16" data-page="dashboard">
      <span class="material-symbols-outlined text-[24px]" style="font-variation-settings: 'FILL' 1;">home</span>
      <span class="font-label-caps text-label-caps text-[10px]">Home</span>
    </button>
    <button class="nav-item flex flex-col items-center justify-center text-outline hover:text-primary-fixed transition-colors gap-1 w-16" data-page="battles">
      <span class="material-symbols-outlined text-[24px]">swords</span>
      <span class="font-label-caps text-label-caps text-[10px]">Battles</span>
    </button>
    <button class="nav-item advanced-feature flex flex-col items-center justify-center text-outline hover:text-primary-fixed transition-colors gap-1 w-16" data-page="battlepass">
      <span class="material-symbols-outlined text-[24px]">military_tech</span>
      <span class="font-label-caps text-label-caps text-[10px]">Pass</span>
    </button>
    <button class="nav-item advanced-feature flex flex-col items-center justify-center text-outline hover:text-primary-fixed transition-colors gap-1 w-16" data-page="leagues">
      <span class="material-symbols-outlined text-[24px]">emoji_events</span>
      <span class="font-label-caps text-label-caps text-[10px]">Leagues</span>
    </button>
    <button class="nav-item flex flex-col items-center justify-center text-outline hover:text-primary-fixed transition-colors gap-1 w-16" data-page="challenges">
      <span class="material-symbols-outlined text-[24px]">bolt</span>
      <span class="font-label-caps text-label-caps text-[10px]">Tasks</span>
    </button>
  </nav>

<!-- ══ MODALS ══ -->`;

html = html.replace(/  <!-- Mobile bottom nav \(game-first\) -->[\s\S]*?<!-- ══ MODALS ══ -->/, newBottom);

fs.writeFileSync('app.html', html);
console.log("App bottom nav replaced using regex.");
