const fs = require('fs');
let html = fs.readFileSync('app.html', 'utf8');

const leaguesContent = `      <!-- ── LEAGUES ── -->
      <div class="page" id="page-leagues">
        <!-- Ambient Background Glow -->
        <div class="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
          <div class="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-glow-purple rounded-full blur-[150px] opacity-40 mix-blend-screen"></div>
          <div class="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-glow-green rounded-full blur-[150px] opacity-20 mix-blend-screen"></div>
        </div>

        <div class="max-w-container-max mx-auto flex flex-col gap-8">
          <!-- Section: Header & Countdown -->
          <section class="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
              <div class="flex items-center gap-3 mb-2">
                <span class="material-symbols-outlined text-secondary-container text-4xl" style="font-variation-settings: 'FILL' 1;">workspace_premium</span>
                <h2 class="font-headline-lg-mobile md:font-headline-lg text-neon-white">Gold League</h2>
              </div>
              <p class="font-body-md text-on-surface-variant">Top 15 advance to Elite. Bottom 10 demote to Silver.</p>
            </div>
            <div class="glass-panel px-6 py-4 rounded-xl flex flex-col items-end border-l-2 border-l-primary-container">
              <span class="font-label-caps text-label-caps text-outline mb-1 uppercase">Cycle Ends In</span>
              <div class="font-data-display text-data-display text-primary-container text-glow">
                3D : 04H : 12M
              </div>
            </div>
          </section>

          <!-- Section: Tier Tabs (HUD Style) -->
          <section class="w-full border-b border-surface-container-highest">
            <div class="flex overflow-x-auto hide-scrollbar gap-2 pb-[-1px] league-tier-tabs">
              <button class="px-6 py-3 font-label-caps text-label-caps text-on-surface-variant hover:text-neon-white transition-colors border-b-2 border-transparent league-tab" data-league="bronze">BRONZE</button>
              <button class="px-6 py-3 font-label-caps text-label-caps text-on-surface-variant hover:text-neon-white transition-colors border-b-2 border-transparent league-tab" data-league="silver">SILVER</button>
              <button class="px-6 py-3 font-label-caps text-label-caps text-primary-container border-b-2 border-primary-container neon-glow-text active league-tab" data-league="gold">GOLD</button>
              <button class="px-6 py-3 font-label-caps text-label-caps text-on-surface-variant hover:text-neon-white transition-colors border-b-2 border-transparent flex items-center gap-2 league-tab" data-league="elite"><span class="material-symbols-outlined text-[14px]">lock</span>ELITE</button>
            </div>
          </section>

          <div style="display:flex; justify-content:center; gap:8px; margin-top:8px; margin-bottom:-8px; z-index:10; position:relative">
            <button id="league-filter-global" class="chip active" style="font-size:0.8rem; padding:4px 12px; background:var(--green); color:#000; border:none">🌍 Global</button>
            <button id="league-filter-local" class="chip" style="font-size:0.8rem; padding:4px 12px; background:var(--surface3); color:var(--text); border:none">📍 My City</button>
          </div>
          
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-4">
            <!-- Main Leaderboard Col -->
            <div class="lg:col-span-2 flex flex-col gap-4">
              <!-- Table Header -->
              <div class="grid grid-cols-[40px_1fr_80px] gap-4 px-4 py-2 font-label-caps text-label-caps text-outline uppercase border-b border-surface-container-highest">
                <div class="text-center">Rank</div>
                <div>Operator</div>
                <div class="text-right">Dist (KM)</div>
              </div>
              
              <!-- Leaderboard List -->
              <div class="flex flex-col gap-2 league-list-wrap" id="league-list">
                <div class="empty text-center p-8 text-on-surface-variant">Loading leaderboard...</div>
              </div>
            </div>

            <!-- Secondary Col: Rewards & Info -->
            <div class="flex flex-col gap-6">
              <!-- Reward Summary Bento Card -->
              <div class="glass-panel rounded-2xl p-6 relative overflow-hidden group">
                <div class="absolute inset-0 bg-gradient-to-br from-primary-container/10 to-transparent opacity-50"></div>
                <h3 class="font-headline-md text-[20px] text-neon-white mb-6 relative z-10 flex items-center gap-2">
                  <span class="material-symbols-outlined text-primary-container">redeem</span> League Rewards
                </h3>
                <div class="space-y-4 relative z-10">
                  <div class="flex justify-between items-center p-3 rounded-lg bg-surface-container-highest/50 border border-white/5">
                    <div class="flex items-center gap-3">
                      <span class="font-data-display text-data-display text-[#FFD700]">1st</span>
                      <span class="font-body-md text-on-surface">Elite Cache + 500 CC</span>
                    </div>
                    <span class="material-symbols-outlined text-[#FFD700]">inventory_2</span>
                  </div>
                  <div class="flex justify-between items-center p-3 rounded-lg bg-surface-container-highest/50 border border-white/5">
                    <div class="flex items-center gap-3">
                      <span class="font-data-display text-data-display text-[#C0C0C0]">2nd</span>
                      <span class="font-body-md text-on-surface">Pro Cache + 250 CC</span>
                    </div>
                    <span class="material-symbols-outlined text-[#C0C0C0]">inventory_2</span>
                  </div>
                  <div class="flex justify-between items-center p-3 rounded-lg bg-surface-container-highest/50 border border-white/5">
                    <div class="flex items-center gap-3">
                      <span class="font-data-display text-data-display text-[#CD7F32]">3rd</span>
                      <span class="font-body-md text-on-surface">Basic Cache + 100 CC</span>
                    </div>
                    <span class="material-symbols-outlined text-[#CD7F32]">inventory_2</span>
                  </div>
                </div>
              </div>
              
              <!-- Rivalry Card -->
              <div class="bg-surface-card border border-outline-variant rounded-2xl p-6 relative" id="league-target-card" style="display:none">
                <h3 class="font-headline-md text-[16px] text-outline mb-4 uppercase tracking-widest">Target Acquired</h3>
                <div class="flex items-center justify-between">
                  <div>
                    <p class="font-label-caps text-label-caps text-on-surface-variant mb-1">To pass <span class="text-neon-white" id="league-target-name">...</span></p>
                    <div class="font-data-display text-data-display text-primary-container text-glow" id="league-target-dist">...</div>
                  </div>
                  <div class="w-12 h-12 rounded-full border-2 border-primary-container/50 flex items-center justify-center bg-surface-deep">
                    <span class="material-symbols-outlined text-primary-container">directions_run</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>`;

html = html.replace(/      <!-- ── LEAGUES ── -->[\s\S]*?<!-- ── CHALLENGES ── -->/, leaguesContent + '\n\n      <!-- ── CHALLENGES ── -->');

fs.writeFileSync('app.html', html);
console.log("Leagues replaced.");
