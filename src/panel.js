// panel.js — the voice agent panel, modeled on the paper's demo UI (Fig. 4/5):
// a transcript, a LIVE badge, a "Speaking…" indicator, a mic button, and
// Restart / End. Typing works everywhere the mic does.

const TEACHER_ICON = `
  <svg viewBox="0 0 40 40" width="34" height="34" aria-hidden="true">
    <line x1="20" y1="3" x2="20" y2="9" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="20" cy="3.5" r="2.5" fill="currentColor"/>
    <rect x="5" y="9" width="30" height="26" rx="7" fill="currentColor"/>
    <circle cx="14" cy="20" r="2.6" fill="#fff"/><circle cx="26" cy="20" r="2.6" fill="#fff"/>
    <rect x="14" y="27" width="12" height="3" rx="1.5" fill="#fff"/>
  </svg>`;

const clock = () => new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });

export function createPanel(root, { canListen, canSpeak, tone, onSubmit, onMic, onRestart, onEnd, onTone, onSpeech, onDownload, onStart }) {
  root.innerHTML = `
    <header class="agent-head">
      <span class="agent-icon">${TEACHER_ICON}</span>
      <div class="agent-title"><div class="agent-name">Voice Agent</div><div class="agent-role">Teacher · guides you, you act</div></div>
      <span class="live" aria-label="Session live">LIVE</span>
    </header>
    <div class="transcript" role="log" aria-live="polite" aria-relevant="additions" aria-label="Conversation">
      <div class="empty-state">
        <p><strong>I'll teach you how to do this yourself.</strong> I'll point to each step on the screen, but you'll do all the clicking and typing.</p>
        <p class="muted">Try saying or typing: “My granddaughter's birthday is this weekend and I'd like to send her a cake, but I don't know where to start.”</p>
        <button class="secondary start-btn" type="button">Start the lesson</button>
      </div>
    </div>
    <div class="status-row" aria-hidden="true"><span class="speaking" hidden>Speaking…</span><span class="heard" hidden></span></div>
    <form class="composer">
      <label class="sr-only" for="say">Message to the Teacher</label>
      <input id="say" autocomplete="off" placeholder="Type, or press the mic to talk">
      <button type="submit" class="send" aria-label="Send">➤</button>
    </form>
    <div class="controls">
      <button type="button" class="mic" aria-pressed="false" ${canListen ? '' : 'disabled title="Voice input is not supported in this browser"'}>
        <span aria-hidden="true">🎙</span> <span class="mic-label">${canListen ? 'Tap to talk' : 'No mic'}</span></button>
      <button type="button" class="secondary restart">Restart</button>
      <button type="button" class="danger end">End</button>
    </div>
    <details class="settings">
      <summary>Settings</summary>
      <label>How I talk
        <select class="tone">
          <option value="warm">Warm: encouraging, explains why</option>
          <option value="neutral">Neutral: explains why, no praise</option>
          <option value="minimal">Minimal: just the steps</option>
        </select></label>
      <label class="check"><input type="checkbox" class="speech" ${canSpeak ? 'checked' : 'disabled'}> Speak my replies aloud</label>
      <label>Speaking speed <input type="range" class="rate" min="0.7" max="1.3" step="0.05" value="0.95"></label>
      <button type="button" class="link download">Download session log (JSON)</button>
    </details>`;

  const $ = (s) => root.querySelector(s);
  const log = $('.transcript');
  const input = $('#say');
  const mic = $('.mic');
  $('.tone').value = tone;

  function add(role, text) {
    const empty = log.querySelector('.empty-state');
    if (empty) empty.remove();
    const m = root.ownerDocument.createElement('div');
    m.className = `msg ${role}`;
    m.innerHTML = `<div class="bubble"></div><div class="time">${clock()}</div>`;
    m.querySelector('.bubble').textContent = text;
    log.append(m);
    log.scrollTop = log.scrollHeight;
  }

  $('.composer').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = input.value.trim();
    if (!v) return;
    input.value = '';
    onSubmit(v);
  });
  $('.start-btn').addEventListener('click', () => onStart());
  // Tap to talk; listening ends by itself when the person pauses, or on a
  // second tap. (Tap rather than hold: holding a button down while speaking is
  // hard for many people.)
  mic.addEventListener('click', () => onMic(mic.getAttribute('aria-pressed') !== 'true'));
  $('.restart').addEventListener('click', () => onRestart());
  $('.end').addEventListener('click', () => onEnd());
  $('.tone').addEventListener('change', (e) => onTone(e.target.value));
  $('.speech').addEventListener('change', (e) => onSpeech({ enabled: e.target.checked }));
  $('.rate').addEventListener('input', (e) => onSpeech({ rate: Number(e.target.value) }));
  $('.download').addEventListener('click', () => onDownload());

  return {
    add,
    clear() { log.innerHTML = ''; },
    setSpeaking(on) { $('.speaking').hidden = !on; },
    setListening(on) {
      mic.classList.toggle('on', on);
      mic.setAttribute('aria-pressed', String(on));
      $('.mic-label').textContent = on ? 'Listening… tap to stop' : 'Tap to talk';
    },
    setHeard(text) { const h = $('.heard'); h.hidden = !text; h.textContent = text ? `“${text}”` : ''; },
    setLive(state) { const l = $('.live'); l.classList.toggle('off', state !== 'live'); l.textContent = { live: 'LIVE', done: 'DONE', ended: 'ENDED' }[state] || 'LIVE'; },
    focusInput() { input.focus(); },
  };
}
