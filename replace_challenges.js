const fs = require('fs');
let html = fs.readFileSync('app.html', 'utf8');

const challengesContent = `      <!-- ── CHALLENGES ── -->
      <div class="page" id="page-challenges">
        <!-- Canvas Container -->
        <div class="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-8 md:py-12 flex flex-col gap-8">
          <!-- Mobile Title -->
          <div class="md:hidden">
            <h2 class="font-headline-lg-mobile text-headline-lg-mobile text-neon-white uppercase tracking-wider">Directives</h2>
            <p class="font-data-display text-[14px] text-primary mt-1">SYSTEM_SYNC: ACTIVE</p>
          </div>

          <!-- Tabs Selection -->
          <div class="flex items-center bg-surface-container rounded-lg p-1 w-full max-w-sm border border-outline-variant/50">
            <button class="flex-1 py-2 text-center rounded-md bg-surface-card text-primary font-label-caps text-label-caps shadow-[0_0_10px_rgba(0,229,160,0.1)] border border-primary/30 transition-all">
              DAILY
            </button>
            <button class="flex-1 py-2 text-center rounded-md text-on-surface-variant font-label-caps text-label-caps hover:text-neon-white transition-colors">
              WEEKLY
            </button>
          </div>

          <!-- Metrics Overview (Bento Micro-Grid) -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="glass-panel rounded-lg p-4 flex flex-col justify-between">
              <span class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-widest">XP Pool</span>
              <span class="font-data-display text-[24px] text-primary" id="ch-xp">--</span>
            </div>
            <div class="glass-panel rounded-lg p-4 flex flex-col justify-between">
              <span class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-widest">Streak</span>
              <span class="font-data-display text-[24px] text-secondary-container text-secondary">4 DAYS</span>
            </div>
          </div>

          <!-- Section: Active Objectives -->
          <div>
            <h3 class="font-label-caps text-label-caps text-on-surface-variant mb-4 flex items-center gap-2">
              <span class="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
              ACTIVE OBJECTIVES
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" id="ch-list">
              <!-- JS injected challenges -->
              <div class="empty text-on-surface-variant text-center p-8">Loading directives...</div>
            </div>
          </div>

          <!-- Section: Upcoming -->
          <div class="mt-4">
            <h3 class="font-label-caps text-label-caps text-outline mb-4 flex items-center gap-2">
              <span class="material-symbols-outlined text-[16px]">lock</span>
              ENCRYPTED DIRECTIVES
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <!-- Locked Slot 1 -->
              <div class="bg-surface-container-highest/30 border border-outline-variant/20 rounded-lg p-6 flex items-center gap-4 grayscale opacity-60">
                <div class="w-12 h-12 rounded bg-surface-deep flex items-center justify-center border border-outline-variant/30">
                  <span class="material-symbols-outlined text-outline">lock</span>
                </div>
                <div>
                  <div class="font-data-display text-[14px] text-outline mb-1">CLASSIFIED</div>
                  <div class="font-label-caps text-[10px] text-outline-variant">Unlocks at Level 45</div>
                </div>
              </div>
              <!-- Locked Slot 2 -->
              <div class="bg-surface-container-highest/30 border border-outline-variant/20 rounded-lg p-6 flex items-center gap-4 grayscale opacity-60">
                <div class="w-12 h-12 rounded bg-surface-deep flex items-center justify-center border border-outline-variant/30">
                  <span class="material-symbols-outlined text-outline">lock</span>
                </div>
                <div>
                  <div class="font-data-display text-[14px] text-outline mb-1">CLASSIFIED</div>
                  <div class="font-label-caps text-[10px] text-outline-variant">Requires Pro License</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>`;

html = html.replace(/      <!-- ── CHALLENGES ── -->[\s\S]*?<!-- ── ADMIN & UTILS ── -->/, challengesContent + '\n\n      <!-- ── ADMIN & UTILS ── -->');

fs.writeFileSync('app.html', html);
console.log("Challenges replaced.");
