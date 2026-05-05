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

  // Quick prompts
  document.querySelectorAll('.qp').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = qs('#chat-in');
      if (input) { input.value = btn.textContent; sendMsg(); }
    });
  });

  // Coming soon coaches
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

  const typingId = appendTyping();
  chatHistory.push({ role: 'user', content: text });

  const systemPrompt = buildSystemPrompt();

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
        max_tokens: 800
      })
    });

    if (!res.ok) throw new Error('Coach unavailable — try again');

    const data = await res.json();
    const reply = data.choices[0].message.content;
    chatHistory.push({ role: 'assistant', content: reply });
    removeTyping(typingId);
    appendMsg('ai', reply);

  } catch (e) {
    removeTyping(typingId);
    appendMsg('ai', `⚠️ ${e.message}`);
  } finally {
    if (sendBtn) sendBtn.disabled = false;
    input?.focus();
  }
}

function buildSystemPrompt() {
  const acts = state.activities.slice(0, 15);
  const runs = acts.filter(a => a.sport_type === 'Run');
  const km = acts.reduce((s, a) => s + (a.distance || 0), 0) / 1000;
  const sc = state.stravaConnection;
  const prefs = state.profile;

  const lang = prefs?.coach_lang === 'es' ? 'Respond in Spanish.' :
               prefs?.coach_lang === 'fr' ? 'Respond in French.' :
               prefs?.coach_lang === 'de' ? 'Respond in German.' : 'Respond in English.';

  const style = prefs?.coach_style === 'motivator' ? 'Be motivating and energetic.' :
                prefs?.coach_style === 'technical'  ? 'Be technical and data-driven.' :
                prefs?.coach_style === 'strict'     ? 'Be strict and demanding.' :
                'Be friendly and supportive.';

  return `You are Cadence AI Coach, an expert running coach and sports scientist.
${lang} ${style}

Athlete: ${sc?.athlete_firstname || 'Runner'} ${sc?.athlete_lastname || ''}
Total activities: ${acts.length} (last 60 days)
Running activities: ${runs.length}
Total distance: ${km.toFixed(1)} km
Goal: ${prefs?.goal || 'fitness'} · Level: ${prefs?.runner_type || 'beginner'}

Recent runs:
${runs.slice(0, 5).map(a =>
  `- ${a.name}: ${(a.distance / 1000).toFixed(2)}km, ${Math.floor(a.moving_time / 60)}min`
).join('\n')}

Be specific, reference their actual data. Keep responses concise, no bullet walls.`;
}

function appendMsg(role, text) {
  const container = qs('#chat-msgs');
  if (!container) return;

  const isUser = role === 'user';
  const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const sc = state.stravaConnection;

  const avHtml = isUser
    ? (sc?.athlete_profile
        ? `<img src="${sc.athlete_profile}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
        : (sc?.athlete_firstname || 'U')[0])
    : 'AI';

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

function appendTyping() {
  const container = qs('#chat-msgs');
  if (!container) return null;

  const id = 'ty-' + Date.now();
  const div = document.createElement('div');
  div.className = 'msg';
  div.id = id;
  div.innerHTML = `
    <div class="msg-av ai">AI</div>
    <div><div class="msg-bubble">
      <div class="typing">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div></div>`;

  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return id;
}

function removeTyping(id) {
  if (id) document.getElementById(id)?.remove();
}
