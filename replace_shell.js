const fs = require('fs');
let html = fs.readFileSync('app.html', 'utf8');

const newHeader = `  <!-- Mobile & Desktop Header -->
  <header class="fixed top-0 w-full z-50 flex justify-between items-center px-margin-mobile md:px-margin-desktop py-4 bg-background/80 backdrop-blur-xl border-b border-white/10 shadow-[0_0_20px_rgba(0,229,160,0.2)]">
    <div class="font-display-hero text-headline-md italic tracking-tighter text-primary-container">CADENCE</div>
    <div class="flex items-center gap-6">
      <button class="text-on-surface-variant hover:text-primary transition-colors scale-95 active:duration-100 flex items-center justify-center">
        <span class="material-symbols-outlined">notifications</span>
      </button>
      <button id="btn-sync" class="text-on-surface-variant hover:text-primary transition-colors scale-95 active:duration-100 flex items-center justify-center" title="Sync">
        <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">sync</span>
      </button>
      <div class="h-8 w-8 rounded-full bg-surface-container-highest overflow-hidden border border-outline-variant">
        <img id="header-avatar-img" alt="User Avatar" class="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA8KetdSusRyxFqK9KN4VmDd58CL0HXV6Yj-XXrAKbXwGI59kNHlaW6oU0Wv3UdiynOaIStvAT8XxKPBEqxNHEnZas4M4c5C0_uG2cATSroWTf79XXqEAyHthGWK7P6K7dqnU2sZfRy0ABWnmANujrOJGphcTMxJDL-7rBlUaV8l5eJa0WAzdZ4czeRb-t34-M6QACyFsntO0F18G1vlJjXebekyg7ee2xFBnpr4Pk4HdQ2Fbv40B2uhrA-Haa1MTuQinvH26AWMTzb"/>
      </div>
    </div>
  </header>

  <!-- Sidebar -->
  <nav class="hidden md:flex flex-col fixed left-0 top-0 h-full z-40 w-64 bg-surface-deep/95 backdrop-blur-md border-r border-outline-variant pt-24">
    <div class="px-6 mb-8">
      <div id="sb-name" class="font-display-hero text-headline-lg text-primary tracking-widest uppercase truncate">Loading...</div>
      <div id="sb-plan-tag" class="font-label-caps text-label-caps text-on-surface-variant mt-2">TRIAL</div>
    </div>
    <div class="flex-1 flex flex-col gap-2 w-full">
      <button class="nav-item active flex items-center gap-4 text-on-surface-variant px-6 py-4 hover:bg-surface-container-highest hover:text-neon-white transition-all w-full text-left" data-page="dashboard">
        <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">dashboard</span>
        <span class="font-label-caps text-label-caps uppercase tracking-wider">Command Center</span>
      </button>
      <button class="nav-item flex items-center gap-4 text-on-surface-variant px-6 py-4 hover:bg-surface-container-highest hover:text-neon-white transition-all w-full text-left" data-page="battles">
        <span class="material-symbols-outlined">swords</span>
        <span class="font-label-caps text-label-caps uppercase tracking-wider">War Room</span>
      </button>
      <button class="nav-item advanced-feature flex items-center gap-4 text-on-surface-variant px-6 py-4 hover:bg-surface-container-highest hover:text-neon-white transition-all w-full text-left" data-page="battlepass">
        <span class="material-symbols-outlined">confirmation_number</span>
        <span class="font-label-caps text-label-caps uppercase tracking-wider">Battle Pass</span>
      </button>
      <button class="nav-item advanced-feature flex items-center gap-4 text-on-surface-variant px-6 py-4 hover:bg-surface-container-highest hover:text-neon-white transition-all w-full text-left" data-page="leagues">
        <span class="material-symbols-outlined">workspace_premium</span>
        <span class="font-label-caps text-label-caps uppercase tracking-wider">Elite Leagues</span>
      </button>
      <button class="nav-item flex items-center gap-4 text-on-surface-variant px-6 py-4 hover:bg-surface-container-highest hover:text-neon-white transition-all w-full text-left" data-page="challenges">
        <span class="material-symbols-outlined">target</span>
        <span class="font-label-caps text-label-caps uppercase tracking-wider">Daily Ops</span>
      </button>
      
      <div class="px-6 py-2 mt-2"><span class="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider opacity-50">Train</span></div>
      <button class="nav-item flex items-center gap-4 text-on-surface-variant px-6 py-4 hover:bg-surface-container-highest hover:text-neon-white transition-all w-full text-left" data-page="coach">
        <span class="material-symbols-outlined">robot_2</span>
        <span class="font-label-caps text-label-caps uppercase tracking-wider">AI Coach</span>
      </button>
      <button class="nav-item flex items-center gap-4 text-on-surface-variant px-6 py-4 hover:bg-surface-container-highest hover:text-neon-white transition-all w-full text-left" data-page="activities">
        <span class="material-symbols-outlined">directions_run</span>
        <span class="font-label-caps text-label-caps uppercase tracking-wider">Activities</span>
      </button>
      <button class="nav-item flex items-center gap-4 text-on-surface-variant px-6 py-4 hover:bg-surface-container-highest hover:text-neon-white transition-all w-full text-left" data-page="groups">
        <span class="material-symbols-outlined">group</span>
        <span class="font-label-caps text-label-caps uppercase tracking-wider">Groups</span>
      </button>
    </div>
    
    <div class="p-6 w-full flex flex-col gap-4 border-t border-outline-variant/50">
      <div class="trial" id="plan-pill" style="display:none"></div>
      <button id="upgrade-btn" class="nav-item w-full bg-primary text-on-primary font-label-caps text-label-caps py-3 uppercase tracking-widest hover:bg-primary-fixed transition-colors shadow-[0_0_15px_rgba(0,229,160,0.4)]" data-page="pricing">
          UPGRADE STATUS
      </button>
      <div class="flex justify-between mt-4">
        <button class="text-on-surface-variant hover:text-primary transition-colors flex flex-col items-center gap-1 nav-item" data-page="settings">
          <span class="material-symbols-outlined text-[20px]">settings</span>
          <span class="font-label-caps text-[10px]">Settings</span>
        </button>
        <button class="text-on-surface-variant hover:text-primary transition-colors flex flex-col items-center gap-1 nav-item" data-page="admin" id="admin-nav-item" style="display:none">
          <span class="material-symbols-outlined text-[20px]">shield</span>
          <span class="font-label-caps text-[10px]">Admin</span>
        </button>
      </div>
    </div>
  </nav>

  <!-- Main -->
  <main class="pt-24 pb-28 md:pb-12 md:pl-[280px] px-margin-mobile md:pr-margin-desktop min-h-screen app-main">

      <!-- ── DASHBOARD ── -->`;

html = html.replace(/<!-- Mobile topbar -->[\s\S]*?<!-- ── DASHBOARD ── -->/, newHeader);

fs.writeFileSync('app.html', html);
console.log("App shell replaced using regex.");
