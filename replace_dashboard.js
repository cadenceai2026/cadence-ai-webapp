const fs = require('fs');
let html = fs.readFileSync('app.html', 'utf8');

const dashContent = `      <!-- ── DASHBOARD ── -->
      <div class="page active" id="page-dashboard">
        <div class="max-w-container-max mx-auto grid grid-cols-4 md:grid-cols-12 gap-gutter md:gap-6">
          <div class="col-span-4 md:col-span-12 glass-panel rounded-xl p-6 md:p-8 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div class="absolute inset-0 opacity-20 pointer-events-none" style="background-image: radial-gradient(circle at 100% 0%, theme('colors.primary-container'), transparent 50%);"></div>
            <div class="relative z-10">
              <h1 class="font-headline-md text-headline-md text-neon-white mb-2 tracking-tight uppercase" id="welcome-name">WELCOME BACK, OPERATOR</h1>
              <div class="flex items-center gap-4 mt-4">
                <div class="h-12 w-12 rounded-full border-2 border-primary flex items-center justify-center bg-surface-deep neon-glow-primary">
                  <span class="font-data-display text-data-display text-primary">42</span>
                </div>
                <div class="flex-1 min-w-[200px]">
                  <div class="flex justify-between mb-2">
                    <span class="font-label-caps text-label-caps text-on-surface-variant uppercase">XP Progress</span>
                    <span class="font-data-display text-[14px] text-primary" id="dash-xp-text">Loading...</span>
                  </div>
                  <div class="h-3 w-full bg-surface-container-lowest flex gap-[2px] p-[2px] rounded-sm overflow-hidden border border-outline-variant/30" id="dash-xp-bar">
                    <!-- XP Bar dynamically injected -->
                    <div class="progress-segment filled-purple"></div><div class="progress-segment filled-purple"></div><div class="progress-segment filled-purple"></div><div class="progress-segment filled-purple"></div><div class="progress-segment filled-purple"></div><div class="progress-segment filled-purple"></div><div class="progress-segment filled"></div><div class="progress-segment"></div><div class="progress-segment"></div>
                  </div>
                </div>
              </div>
            </div>
            <div class="relative z-10 glass-panel border border-primary/30 px-4 py-3 rounded-lg flex items-center gap-3 w-full md:w-auto" id="dash-streak">
              <span class="material-symbols-outlined text-tertiary-fixed-dim text-[28px]" style="font-variation-settings: 'FILL' 1;">local_fire_department</span>
              <div>
                <div class="font-label-caps text-label-caps text-neon-white uppercase tracking-widest">5 Day Streak</div>
                <div class="font-data-display text-[12px] text-primary mt-1">1.2x XP ACTIVE</div>
              </div>
            </div>
          </div>

          <div class="col-span-4 md:col-span-8 glass-panel rounded-xl p-6 border-l-4 border-error" id="dash-rival-callout">
            <div class="flex justify-between items-start mb-6">
              <div>
                <div class="font-label-caps text-label-caps text-error uppercase tracking-widest flex items-center gap-2 mb-1">
                  <span class="material-symbols-outlined text-[16px]">radar</span>
                  Active Battle
                </div>
                <h2 class="font-headline-md text-headline-md text-neon-white uppercase">VS. ALEX M.</h2>
              </div>
              <div class="font-data-display text-data-display text-error text-right">
                -0.8<span class="text-[14px] text-on-surface-variant">KM</span>
              </div>
            </div>
            <div class="space-y-6">
              <div>
                <div class="flex justify-between font-label-caps text-label-caps mb-2 uppercase">
                  <span class="text-primary">You</span>
                  <span class="text-primary font-data-display">12.4 KM</span>
                </div>
                <div class="h-2 w-full bg-surface-container rounded-full overflow-hidden relative shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]">
                  <div class="absolute top-0 left-0 h-full bg-primary w-[48%] shadow-[0_0_10px_rgba(0,229,160,0.8)]"></div>
                </div>
              </div>
              <div>
                <div class="flex justify-between font-label-caps text-label-caps mb-2 uppercase">
                  <span class="text-error">Alex M.</span>
                  <span class="text-error font-data-display">13.2 KM</span>
                </div>
                <div class="h-2 w-full bg-surface-container rounded-full overflow-hidden relative shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]">
                  <div class="absolute top-0 left-0 h-full bg-error w-[52%] shadow-[0_0_10px_rgba(255,180,171,0.5)]"></div>
                </div>
              </div>
            </div>
            <div class="mt-6 bg-error/10 border border-error/20 p-3 text-center rounded flex items-center justify-between">
              <span class="font-label-caps text-label-caps text-error uppercase tracking-widest">Target locked. Catch up!</span>
              <button class="bg-error/20 hover:bg-error/30 text-error px-4 py-2 font-label-caps text-[12px] uppercase tracking-widest transition-colors rounded">Invite Rival</button>
            </div>
          </div>

          <div class="col-span-4 md:col-span-4 flex flex-col gap-gutter md:gap-6">
            <div class="glass-panel rounded-xl p-6 flex-1 flex flex-col justify-center items-center text-center relative overflow-hidden group border border-secondary-container/50 hover:border-secondary-container transition-colors cursor-pointer" onclick="navigate('challenges')">
              <div class="absolute inset-0 opacity-10 bg-gradient-to-br from-secondary-container to-transparent group-hover:opacity-20 transition-opacity"></div>
              <span class="material-symbols-outlined text-secondary text-[40px] mb-4" style="font-variation-settings: 'FILL' 1;">target</span>
              <h3 class="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest mb-2">Daily Ops</h3>
              <div class="font-headline-md text-headline-md text-neon-white uppercase mb-6 leading-tight">Run 5km<br/>Today</div>
              <div class="w-full relative pt-1">
                <div class="flex mb-2 items-center justify-between">
                  <div class="font-data-display text-[14px] text-secondary">75%</div>
                  <div class="font-data-display text-[14px] text-on-surface-variant">3.75 / 5.0 KM</div>
                </div>
                <div class="flex h-1.5 overflow-hidden bg-surface-container rounded-full">
                  <div class="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-secondary shadow-[0_0_10px_rgba(207,189,255,0.6)]" style="width: 75%"></div>
                </div>
              </div>
            </div>
            <button class="w-full bg-primary hover:bg-primary-fixed text-on-primary-fixed font-headline-md text-[20px] py-5 uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(0,229,160,0.3)] hover:shadow-[0_0_40px_rgba(0,229,160,0.6)] rounded-xl flex items-center justify-center gap-3">
              <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">sync</span>
              Pull Telemetry
            </button>
          </div>

          <div class="col-span-4 md:col-span-12 glass-panel rounded-xl p-6">
            <div class="flex justify-between items-center mb-6 border-b border-outline-variant/30 pb-4 cursor-pointer" onclick="toggleCollapse('wrap-acts', this)">
              <h2 class="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest flex items-center gap-2">
                Recent Ops Log
                <span class="collapse-icon material-symbols-outlined text-[16px] transition-transform duration-300">expand_less</span>
              </h2>
              <button class="font-label-caps text-label-caps text-primary hover:text-primary-fixed uppercase tracking-widest" onclick="event.stopPropagation(); navigate('activities')">View All</button>
            </div>
            <div id="wrap-acts" class="flex flex-col gap-2 transition-all duration-300 overflow-hidden">
              <div id="dash-acts">
                <div class="empty"><span class="spinner"></span> Loading…</div>
              </div>
            </div>
          </div>

          <div class="col-span-4 md:col-span-12 glass-panel rounded-xl p-6">
            <div class="flex justify-between items-center mb-6 border-b border-outline-variant/30 pb-4 cursor-pointer" onclick="toggleCollapse('wrap-heatmap', this)">
              <h2 class="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest flex items-center gap-2">
                Activity Heatmap
                <span class="collapse-icon material-symbols-outlined text-[16px] transition-transform duration-300">expand_less</span>
              </h2>
            </div>
            <div id="wrap-heatmap" class="transition-all duration-300 overflow-hidden">
              <div class="heatmap-container" id="dash-heatmap">
                <div class="skeleton-box" style="height:40px;border-radius:6px;width:100%"></div>
              </div>
            </div>
          </div>

          <div class="col-span-4 md:col-span-12 glass-panel rounded-xl p-6">
            <div class="flex justify-between items-center mb-6 border-b border-outline-variant/30 pb-4 cursor-pointer" onclick="toggleCollapse('wrap-badges', this)">
              <h2 class="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest flex items-center gap-2">
                Badges & Achievements
                <span class="collapse-icon material-symbols-outlined text-[16px] transition-transform duration-300">expand_less</span>
              </h2>
            </div>
            <div id="wrap-badges" class="transition-all duration-300 overflow-hidden">
              <div class="flex overflow-x-auto gap-4 pb-2" id="dash-badges">
                <div class="skeleton-box" style="height:100px;border-radius:12px;width:120px;flex-shrink:0"></div>
                <div class="skeleton-box" style="height:100px;border-radius:12px;width:120px;flex-shrink:0"></div>
                <div class="skeleton-box" style="height:100px;border-radius:12px;width:120px;flex-shrink:0"></div>
              </div>
            </div>
          </div>

        </div>
      </div>`;

html = html.replace(/      <!-- ── DASHBOARD ── -->[\s\S]*?<!-- ── AI COACH ── -->/, dashContent + '\n\n      <!-- ── AI COACH ── -->');

fs.writeFileSync('app.html', html);
console.log("Dashboard replaced.");
