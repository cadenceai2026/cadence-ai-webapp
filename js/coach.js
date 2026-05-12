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
  appendMsg('ai', "Hey! I'm your Cadence AI Coach 🏃 I have your Strava data loaded. Ask me anything about your training!");
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

  const systemPrompt = buildSystemPrompt();
  const aiBubble = appendStreamingBubble();

  try {
    const res = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai',
        messages: [
          { role: 'system', content: systemPrompt },
          ...chatHistory
        ],
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

    chatHistory.push({ role: 'assistant', content: reply });

  } catch (e) {
    updateStreamingBubble(aiBubble, `⚠️ ${e.message}`);
  } finally {
    if (sendBtn) sendBtn.disabled = false;
    input?.focus();
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
  div.className = `msg ${isUser ? 'user' : ''}`;
  div.innerHTML = `
    <div class="msg-av ${isUser ? 'me' : 'ai'}">${avHtml}</div>
    <div>
      <div class="msg-bubble">${esc(text).replace(/\n/g, '<br>')}</div>
      <div class="msg-time">${now}</div>
    </div>`;

  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function appendStreamingBubble() {
  const container = qs('#chat-msgs');
  if (!container) return null;

  const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const div = document.createElement('div');
  div.className = 'msg';
  div.innerHTML = `
    <div class="msg-av ai">AI</div>
    <div>
      <div class="msg-bubble streaming-content">
        <div class="typing">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      </div>
      <div class="msg-time">${now}</div>
    </div>`;

  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return div;
}

function updateStreamingBubble(div, text) {
  if (!div) return;
  const bubble = div.querySelector('.msg-bubble');
  if (bubble) {
    bubble.innerHTML = esc(text).replace(/\n/g, '<br>');
  }
  const container = qs('#chat-msgs');
  if (container) container.scrollTop = container.scrollHeight;
}
