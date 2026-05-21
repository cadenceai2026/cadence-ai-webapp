const fs = require('fs');
let html = fs.readFileSync('app.html', 'utf8');

const battlesContent = `      <!-- ── BATTLES ── -->
      <div class="page" id="page-battles">
        <!-- Background Ambient Effects -->
        <div class="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] pointer-events-none -z-10"></div>
        <div class="fixed bottom-0 right-0 w-[600px] h-[600px] bg-error/5 rounded-full blur-[100px] pointer-events-none -z-10"></div>
        <div class="max-w-container-max mx-auto">
          <!-- Page Header -->
          <div class="mb-8 md:mb-12 flex justify-between items-end">
            <div>
              <h1 class="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-neon-white uppercase tracking-tight">The War Room</h1>
              <p class="font-body-md text-body-md text-on-surface-variant mt-2 max-w-xl">Active engagements and global telemetry. Push beyond the limits.</p>
            </div>
            <div class="hidden md:flex flex-col items-end">
              <span class="font-label-caps text-label-caps text-primary border border-primary/30 px-3 py-1 rounded-sm bg-primary/5">LIVE TELEMETRY</span>
              <span class="font-data-display text-data-display text-on-surface-variant mt-2 text-sm">SYS.STATUS: <span class="text-primary">NOMINAL</span></span>
            </div>
          </div>
          <!-- Dashboard Grid -->
          <div class="grid grid-cols-1 md:grid-cols-12 gap-gutter md:gap-6">
            <!-- Main Battle Canvas (Spans 8 cols on desktop) -->
            <div class="md:col-span-8 space-y-6">
              
              <!-- No battle state -->
              <div class="battle-empty glass-panel rounded-xl p-8 flex-col items-center justify-center text-center" id="battle-empty" style="display:none">
                <div style="font-size:3rem;margin-bottom:12px">⚔️</div>
                <div class="font-headline-md text-neon-white mb-2">No active battle</div>
                <div class="text-on-surface-variant mb-6">Get matched with a rival your level</div>
                <button class="bg-primary hover:bg-primary-fixed text-on-primary-fixed font-label-caps px-6 py-3 uppercase tracking-widest rounded" id="btn-find-battle">Find a rival →</button>
              </div>

              <!-- Active Battle Card -->
              <div class="glass-panel rounded-xl p-6 md:p-8 relative overflow-hidden" id="battle-hero">
                <!-- Background Grid Pattern -->
                <div class="absolute inset-0 opacity-[0.03] pointer-events-none" style="background-image: linear-gradient(theme('colors.on-surface') 1px, transparent 1px), linear-gradient(90deg, theme('colors.on-surface') 1px, transparent 1px); background-size: 20px 20px;"></div>
                <div class="flex justify-between items-center mb-8 relative z-10">
                  <div class="flex items-center gap-3">
                    <span class="material-symbols-outlined text-primary text-3xl" style="font-variation-settings: 'FILL' 1;">swords</span>
                    <div>
                      <h2 class="font-headline-md text-headline-md text-neon-white" id="battle-title">Current Engagement</h2>
                      <p class="font-label-caps text-label-caps text-on-surface-variant mt-1">WEEKLY DISTANCE CLASH</p>
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="font-data-display text-data-display text-primary text-xl" id="battle-timer">--</div>
                    <div class="font-label-caps text-label-caps text-on-surface-variant mt-1 tracking-widest">REMAINING</div>
                  </div>
                </div>
                <!-- Battle Visualizer -->
                <div class="relative py-12 z-10">
                  <!-- Differential Indicator -->
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 text-center">
                    <div class="font-display-hero text-5xl md:text-6xl text-primary tracking-tighter drop-shadow-[0_0_15px_rgba(0,229,160,0.5)]" id="battle-status-badge">VS</div>
                  </div>
                  <!-- Progress Bars Container -->
                  <div class="mt-16 space-y-8">
                    <!-- User Bar -->
                    <div class="relative">
                      <div class="flex justify-between mb-2">
                        <div class="font-label-caps text-label-caps text-neon-white flex items-center gap-2">
                          <div class="w-5 h-5 rounded-full border border-primary/50 flex items-center justify-center text-[10px] bg-primary/20" id="battle-you-av">Y</div>
                          YOU
                        </div>
                        <div class="font-data-display text-data-display text-neon-white text-lg" id="battle-you-km">-- KM</div>
                      </div>
                      <div class="h-4 w-full bg-surface-container-high rounded-full overflow-hidden flex shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
                        <div class="h-full bg-primary w-[50%] flex space-x-[2px] relative" id="battle-bar-you">
                          <div class="absolute inset-0 bg-gradient-to-r from-transparent to-white/30"></div>
                        </div>
                      </div>
                    </div>
                    <!-- Rival Bar -->
                    <div class="relative">
                      <div class="flex justify-between mb-2">
                        <div class="font-label-caps text-label-caps text-error flex items-center gap-2">
                          <div class="w-5 h-5 rounded-full border border-error/50 flex items-center justify-center text-[10px] bg-error/20" id="battle-rival-av">R</div>
                          <span id="battle-rival-name">RIVAL</span>
                        </div>
                        <div class="font-data-display text-data-display text-error text-lg" id="battle-rival-km">-- KM</div>
                      </div>
                      <div class="h-4 w-full bg-surface-container-high rounded-full overflow-hidden flex shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
                        <div class="h-full bg-error w-[50%] flex space-x-[2px] relative" id="battle-bar-rival">
                          <div class="absolute inset-0 bg-gradient-to-r from-transparent to-black/30"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <!-- Battle Ticker -->
                <div class="mt-4 bg-surface-container-lowest/80 border border-outline-variant p-3 rounded-lg flex items-center gap-3">
                  <span class="material-symbols-outlined text-primary animate-pulse text-sm">sensors</span>
                  <div class="font-data-display text-data-display text-sm text-on-surface-variant overflow-hidden whitespace-nowrap" id="battle-message">
                    <span class="text-neon-white">LATEST UPDATE:</span> Loading...
                  </div>
                </div>
                <!-- Actions -->
                <div class="mt-6 flex gap-4">
                  <button class="bg-primary hover:bg-primary-fixed text-on-primary-fixed font-label-caps px-4 py-2 uppercase tracking-widest rounded" id="btn-battle-sync">↻ Sync Run</button>
                  <button class="bg-surface-container-highest text-neon-white border border-outline-variant hover:border-primary font-label-caps px-4 py-2 uppercase tracking-widest rounded" id="btn-rematch">🔄 Rematch</button>
                  <button class="bg-surface-container-highest text-neon-white border border-outline-variant hover:border-primary font-label-caps px-4 py-2 uppercase tracking-widest rounded">Invite a Rival</button>
                </div>
              </div>

              <!-- Rival History -->
              <div class="glass-panel rounded-xl p-6">
                <h3 class="font-headline-md text-headline-md text-neon-white mb-6 text-lg">Combat Log</h3>
                <div class="space-y-4" id="battle-history">
                  <!-- History injected here -->
                  <div class="text-on-surface-variant text-sm">Loading history...</div>
                </div>
              </div>
            </div>

            <!-- Global Feed Sidebar (Spans 4 cols on desktop) -->
            <div class="md:col-span-4 h-full">
              <div class="glass-panel rounded-xl p-6 h-full flex flex-col">
                <div class="flex items-center gap-2 mb-6">
                  <span class="material-symbols-outlined text-primary text-sm">public</span>
                  <h3 class="font-label-caps text-label-caps text-primary tracking-widest">GLOBAL THEATER FEED</h3>
                </div>
                <div class="flex-1 overflow-y-auto space-y-4 pr-2">
                  <div class="bg-surface-container-lowest/50 p-3 rounded border-l-2 border-primary">
                    <div class="font-body-md text-body-md text-sm text-neon-white mb-1">
                      <span class="font-bold">Ghost_Runner</span> dominated <span class="text-on-surface-variant">User404</span>
                    </div>
                    <div class="font-data-display text-data-display text-xs text-primary">+15.2km Differential</div>
                  </div>
                  <div class="bg-surface-container-lowest/50 p-3 rounded border-l-2 border-secondary-container">
                    <div class="font-body-md text-body-md text-sm text-neon-white mb-1">
                      <span class="font-bold">IronLungs</span> secured a narrow victory over <span class="text-on-surface-variant">PaceMaker</span>
                    </div>
                    <div class="font-data-display text-data-display text-xs text-secondary-fixed-dim">+0.8km Differential</div>
                  </div>
                  <div class="bg-surface-container-lowest/50 p-3 rounded border-l-2 border-outline-variant">
                    <div class="font-body-md text-body-md text-sm text-neon-white mb-1">
                      <span class="text-on-surface-variant">New battle initiated:</span> <span class="font-bold">NeoTrack</span> vs <span class="font-bold">Trinity</span>
                    </div>
                    <div class="font-data-display text-data-display text-xs text-on-surface-variant">System mapping underway...</div>
                  </div>
                </div>
                <button class="w-full mt-4 bg-transparent text-on-surface-variant font-label-caps text-label-caps py-2 border border-outline-variant rounded-sm hover:text-neon-white hover:border-primary/50 transition-colors text-xs">
                  VIEW FULL LOGS
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>`;

html = html.replace(/      <!-- ── BATTLES ── -->[\s\S]*?<!-- ── BATTLE PASS ── -->/, battlesContent + '\n\n      <!-- ── BATTLE PASS ── -->');

fs.writeFileSync('app.html', html);
console.log("Battles replaced.");
