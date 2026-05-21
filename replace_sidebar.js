const fs = require('fs');
let html = fs.readFileSync('app.html', 'utf8');

const oldSidebar = `  <!-- Sidebar -->
  <nav class="hidden md:flex flex-col fixed left-0 top-0 h-full z-40 w-64 bg-surface-deep/95 backdrop-blur-md border-r border-outline-variant pt-24">
    <div class="px-6 mb-8">
      <div id="sb-name" class="font-display-hero text-headline-lg text-primary tracking-widest uppercase truncate">Loading...</div>
      <div id="sb-plan-tag" class="font-label-caps text-label-caps text-on-surface-variant mt-2">TRIAL</div>
    </div>`;

const newSidebar = `  <!-- Sidebar -->
  <nav id="app-sidebar" class="hidden md:flex flex-col fixed left-0 top-0 h-full z-40 w-64 bg-surface-deep/95 backdrop-blur-md border-r border-outline-variant pt-24 transition-all duration-300">
    <div class="px-6 mb-8 flex items-center justify-between">
      <div class="flex items-center gap-3 overflow-hidden">
        <img src="/favicon.svg" alt="Cadence Logo" class="w-8 h-8 flex-shrink-0" id="sb-logo">
        <div class="flex flex-col nav-text whitespace-nowrap transition-opacity duration-300">
          <div id="sb-name" class="font-display-hero text-[16px] text-primary tracking-widest uppercase truncate max-w-[120px]">Loading...</div>
          <div id="sb-plan-tag" class="font-label-caps text-[10px] text-on-surface-variant mt-1">TRIAL</div>
        </div>
      </div>
      <button id="btn-toggle-sidebar" class="text-on-surface-variant hover:text-primary transition-colors flex-shrink-0 ml-2">
        <span class="material-symbols-outlined">menu_open</span>
      </button>
    </div>`;

html = html.replace(oldSidebar, newSidebar);

// I also need to make sure the app-main transitions properly
html = html.replace(
  `<main class="pt-24 pb-28 md:pb-12 md:pl-[280px] px-margin-mobile md:pr-margin-desktop min-h-screen app-main">`,
  `<main id="app-main" class="pt-24 pb-28 md:pb-12 md:pl-[280px] px-margin-mobile md:pr-margin-desktop min-h-screen app-main transition-all duration-300">`
);

fs.writeFileSync('app.html', html);
console.log("Sidebar replaced");
