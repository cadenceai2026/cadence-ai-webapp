const fs = require('fs');
let html = fs.readFileSync('app.html', 'utf8');

const passContent = `      <!-- ── BATTLE PASS ── -->
      <div class="page" id="page-battlepass">
        <!-- Hero Section -->
        <section class="relative w-full h-[400px] mb-8 overflow-hidden rounded-xl hud-border">
          <div class="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-luminosity" data-alt="A cinematic, wide-angle view of a futuristic cyberpunk cityscape at night, illuminated by stark neon greens and deep purples against obsidian architecture. The scene captures the high-performance, gamified 'Rise of the Runners' theme with glowing data streams overlaying the urban geometry." style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuBKufQAMxLUBhIVLxsiW-N1CGkvK61O_UqYqlWo0YUPsVPhoLhv9MST1MVPjK0UVGZn08CmspJZcAsvBx2VcxxrBxkCdVHGbYlQSt128KW_AgKOEd6-jiucYROUy5YKExnvoPH1X3LAfQk5zqZI7zgsUV6GmLojdZ6aJSc1MsCVlePg-cJhDNXkvMaUGlbsVvQFuuBl0MgHu9qs5K5stXCr5Uyjpag70NTxdoB3Xtq3XHk2XFNfB-y_3qWFVUaNPU6ZThSuX6Ds_XY6');"></div>
          <div class="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent"></div>
          <div class="absolute inset-0 bg-gradient-to-r from-background via-background/50 to-transparent"></div>
          <div class="relative h-full flex flex-col justify-end p-8 md:p-12 z-10 w-full max-w-4xl">
            <div class="inline-flex items-center gap-2 px-3 py-1 bg-surface-container border border-primary/30 rounded text-primary font-label-caps text-label-caps mb-4 w-max">
              <span class="material-symbols-outlined text-[16px]">sync</span>
              <span>SEASON 1 ACTIVE</span>
            </div>
            <h2 class="font-display-hero text-headline-lg-mobile md:text-display-hero text-neon-white mb-4 uppercase tracking-tighter">Season 1: Rise of the Runners</h2>
            <div class="flex flex-col md:flex-row gap-6 mt-4">
              <div class="glass-panel p-4 rounded-lg flex-1 hud-border hud-glow-primary">
                <div class="font-label-caps text-label-caps text-on-surface-variant mb-2 uppercase">Current Level</div>
                <div class="flex items-end gap-3">
                  <span class="font-data-display text-headline-lg text-primary" id="bp-level">1</span>
                  <span class="font-body-md text-body-md text-on-surface-variant pb-1">/ 50</span>
                </div>
                <div class="mt-4">
                  <div class="flex justify-between font-label-caps text-label-caps mb-2 text-on-surface">
                    <span id="bp-xp">0 XP</span>
                    <span id="bp-next">NEXT: 1000 XP</span>
                  </div>
                  <div class="w-full bg-surface-deep h-2 rounded-full overflow-hidden flex">
                    <div class="bg-primary h-full w-0" id="bp-xp-fill" style="box-shadow: 0 0 10px rgba(0, 229, 160, 0.8);"></div>
                  </div>
                </div>
              </div>
              <div class="glass-panel p-4 rounded-lg flex-1 hud-border border-secondary-container bg-secondary-container/10 hud-glow-secondary relative overflow-hidden group">
                <div class="absolute inset-0 bg-gradient-to-r from-secondary-container/0 via-secondary-container/20 to-secondary-container/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                <div class="relative z-10 flex flex-col h-full justify-between">
                  <div>
                    <div class="font-label-caps text-label-caps text-secondary mb-1 uppercase flex items-center gap-2" id="bp-status">
                      <span class="material-symbols-outlined text-[16px]">stars</span>
                      Elite Pass Inactive
                    </div>
                    <p class="font-body-md text-body-md text-on-surface mt-2">Unlock 50+ premium rewards, XP boosts, and exclusive skins.</p>
                  </div>
                  <button class="mt-4 w-full py-2 bg-secondary text-on-secondary font-label-caps text-label-caps font-bold hover:bg-secondary-fixed hover:shadow-[0_0_20px_rgba(207,189,255,0.5)] transition-all" id="btn-upgrade-pass">
                    GO PREMIUM - 950 CC
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Pass Progression Track -->
        <section class="mt-12">
          <div class="flex justify-between items-center mb-6">
            <h3 class="font-headline-md text-headline-md text-neon-white uppercase">Reward Track</h3>
            <div class="font-label-caps text-label-caps text-on-surface-variant flex gap-4">
              <span class="flex items-center gap-1"><div class="w-3 h-3 bg-surface-container border border-outline"></div> Free</span>
              <span class="flex items-center gap-1"><div class="w-3 h-3 bg-secondary-container/20 border border-secondary"></div> Premium</span>
            </div>
          </div>
          <!-- Horizontal Track Container -->
          <div class="relative w-full overflow-x-auto hide-scrollbar pb-8 pt-4">
            <div class="inline-flex gap-4 min-w-full px-4" id="bp-track">
              <!-- JS will inject rewards here -->
              <div class="text-on-surface-variant p-4">Loading reward track...</div>
            </div>
          </div>
          <!-- Scroll Indicator -->
          <div class="flex justify-center items-center mt-4 text-outline-variant font-label-caps text-[10px] gap-2">
            <span class="material-symbols-outlined text-[16px]">swipe_left</span>
            <span>SWIPE TO VIEW TRACK</span>
            <span class="material-symbols-outlined text-[16px]">swipe_right</span>
          </div>
        </section>
      </div>`;

html = html.replace(/      <!-- ── BATTLE PASS ── -->[\s\S]*?<!-- ── LEAGUES ── -->/, passContent + '\n\n      <!-- ── LEAGUES ── -->');

fs.writeFileSync('app.html', html);
console.log("Battle Pass replaced.");
