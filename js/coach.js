import { state } from './state.js';
import { qs, toast, esc } from './utils.js';

let chatHistory = [];

export function initCoach() {
  qs('#btn-start-chat')?.addEventListener('click', startChat);
  qs('#btn-back-selector')?.addEventListener('click', backToSelector);
  qs('#chat-send')?.addEventListener('click', sendMsg);
  qs('#chat-in')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); }
  });

  document.querySelectorAll('.qp').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = qs('#chat-in');
      if (input) { input.value = btn.textContent; sendMsg(); }
    });
  });

  document.querySelectorAll('.coach-card.soon').forEach(btn => {
    btn.addEventListener('click', () => toast('Coming soon! 🚀'));
  });

  window.startChat = startChat;
}

function startChat() {
  qs('#coach-selector').style.display = 'none';
  qs('#coach-chat').style.display = 'block';
  chatHistory = [];
  const msgs = qs('#chat-msgs');
  if (msgs) msgs.innerHTML = '';
  
  const systemPrompt = buildSystemPrompt();
  chatHistory.push({ role: 'system', content: systemPrompt });
  
  // Ask the AI to generate a proactive greeting based on user data
  const initialPrompt = "Review my recent activities and current streak. Give me a very short, personalized, proactive 1-sentence greeting, ending with an engaging question.";
  
  const aiBubble = appendStreamingBubble();
  
  // We don't push the initial prompt to chatHistory so the user doesn't see it as their own message
  const context = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: initialPrompt }
  ];
  
  streamAIResponse(context, aiBubble).then(reply => {
    chatHistory.push({ role: 'assistant', content: reply });
  });
}

function backToSelector() {
  qs('#coach-selector').style.display = 'block';
  qs('#coach-chat').style.display = 'none';
  chatHistory = [];
}

async function sendMsg() {
  const input = qs('#chat-in');
  const text = input?.value.trim();
  if (!text) return;

  input.value = '';
  appendMsg('user', text);

  const sendBtn = qs('#chat-send');
  if (sendBtn) sendBtn.disabled = true;

  chatHistory.push({ role: 'user', content: text });

  const aiBubble = appendStreamingBubble();

  try {
    const reply = await streamAIResponse(chatHistory, aiBubble);
    chatHistory.push({ role: 'assistant', content: reply });
  } finally {
    if (sendBtn) sendBtn.disabled = false;
    input?.focus();
  }
}

async function streamAIResponse(messages, aiBubble) {
  try {
    const res = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai',
        messages: messages,
        max_tokens: 1200,
        stream: true
      })
    });

    if (!res.ok) throw new Error('Coach unavailable — try again');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let reply = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if (payload === '[DONE]') break;
        try {
          const parsed = JSON.parse(payload);
          const delta = parsed.choices?.[0]?.delta?.content || '';
          if (delta) {
            reply += delta;
            updateStreamingBubble(aiBubble, reply);
          }
        } catch {
          // ignore malformed SSE chunks
        }
      }
    }
    return reply;
  } catch (e) {
    updateStreamingBubble(aiBubble, `⚠️ ${e.message}`);
    return `⚠️ ${e.message}`;
  }
}

function buildSystemPrompt() {
  const acts = state.activities.slice(0, 20);
  const runs = acts.filter(a => a.sport_type === 'Run' || a.sport_type === 'TrailRun');
  const totalKm = acts.reduce((s, a) => s + (a.distance || 0), 0) / 1000;
  const sc = state.stravaConnection;
  const prefs = state.profile;

  const lang = prefs?.coach_lang === 'es' ? 'Respond in Spanish.' :
               prefs?.coach_lang === 'fr' ? 'Respond in French.' :
               prefs?.coach_lang === 'de' ? 'Respond in German.' : 'Respond in English.';

  const style = prefs?.coach_style === 'motivator' ? 'Be motivating and energetic.' :
                prefs?.coach_style === 'technical'  ? 'Be technical and data-driven.' :
                prefs?.coach_style === 'strict'     ? 'Be strict and demanding.' :
                'Be friendly and supportive.';

  const recentRuns = runs.slice(0, 6).map(a => {
    const km = (a.distance / 1000).toFixed(2);
    const min = Math.floor(a.moving_time / 60);
    const paceSecPerKm = a.distance > 0 ? (a.moving_time / (a.distance / 1000)) : 0;
    const paceMin = Math.floor(paceSecPerKm / 60);
    const paceSec = Math.round(paceSecPerKm % 60);
    const hr = a.average_heartrate ? ` HR:${Math.round(a.average_heartrate)}bpm` : '';
    return `- ${a.name}: ${km}km in ${min}min (${paceMin}:${String(paceSec).padStart(2,'0')}/km)${hr}`;
  }).join('\n');

  return `You are Cadence AI Coach, an expert running coach and sports scientist.
${lang} ${style}

Athlete: ${sc?.athlete_firstname || 'Runner'} ${sc?.athlete_lastname || ''}
Goal: ${prefs?.goal || 'general fitness'} · Level: ${prefs?.runner_type || 'beginner'}
Activities last 60 days: ${acts.length} total, ${runs.length} runs, ${totalKm.toFixed(1)} km

Recent runs:
${recentRuns || 'No recent runs recorded yet.'}

Reference their actual data when relevant. Be concise — 2-4 short paragraphs max. No excessive bullet lists.`;
}

function appendMsg(role, text) {
  const container = qs('#chat-msgs');
  if (!container) return;

  const isUser = role === 'user';
  const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const sc = state.stravaConnection;
  const profile = state.profile;

  // Prefer custom avatar > Strava photo > initials
  const userPhotoSrc = profile?.avatar_url || sc?.athlete_profile || null;
  const avHtml = isUser
    ? (userPhotoSrc
        ? `<img src="${userPhotoSrc}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
        : (sc?.athlete_firstname || profile?.display_name || 'U')[0].toUpperCase())
    : '🤖';

  const div = document.createElement('div');
  div.className = `flex gap-4 w-full ${isUser ? 'flex-row-reverse' : ''}`;
  
  const bubbleClass = isUser 
    ? 'bg-primary text-on-primary rounded-l-xl rounded-tr-xl rounded-br-sm' 
    : 'bg-surface-container-highest border border-outline-variant/30 text-neon-white rounded-r-xl rounded-tl-xl rounded-bl-sm';

  div.innerHTML = `
    <div class="w-8 h-8 rounded-full bg-surface-deep flex-shrink-0 flex items-center justify-center overflow-hidden border ${isUser ? 'border-primary' : 'border-outline-variant'}">
      ${avHtml}
    </div>
    <div class="flex flex-col gap-1 max-w-[80%] ${isUser ? 'items-end' : 'items-start'}">
      <div class="p-3 shadow-lg ${bubbleClass}">
        ${esc(text).replace(/\n/g, '<br>')}
      </div>
      <div class="font-label-caps text-[10px] text-on-surface-variant/70 uppercase tracking-widest px-1">${now}</div>
    </div>`;

  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function appendStreamingBubble() {
  const container = qs('#chat-msgs');
  if (!container) return null;

  const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const div = document.createElement('div');
  div.className = 'flex gap-4 w-full';
  div.innerHTML = `
    <div class="w-8 h-8 rounded-full bg-surface-deep flex-shrink-0 flex items-center justify-center overflow-hidden border border-outline-variant text-[14px]">
      🤖
    </div>
    <div class="flex flex-col gap-1 max-w-[80%] items-start">
      <div class="p-3 shadow-lg bg-surface-container-highest border border-outline-variant/30 text-neon-white rounded-r-xl rounded-tl-xl rounded-bl-sm streaming-content">
        <div class="flex gap-1 py-1">
          <div class="w-2 h-2 rounded-full bg-primary animate-bounce"></div>
          <div class="w-2 h-2 rounded-full bg-primary animate-bounce" style="animation-delay: 0.2s"></div>
          <div class="w-2 h-2 rounded-full bg-primary animate-bounce" style="animation-delay: 0.4s"></div>
        </div>
      </div>
      <div class="font-label-caps text-[10px] text-on-surface-variant/70 uppercase tracking-widest px-1">${now}</div>
    </div>`;

  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return div;
}

function updateStreamingBubble(div, text) {
  if (!div) return;
  const bubble = div.querySelector('.streaming-content');
  if (bubble) {
    bubble.innerHTML = esc(text).replace(/\n/g, '<br>');
  }
  const container = qs('#chat-msgs');
  if (container) container.scrollTop = container.scrollHeight;
}
