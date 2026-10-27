// panel.js — the voice agent panel, modeled on the paper's demo UI (Fig. 4/5):
// a transcript, a LIVE badge, a "Speaking…" indicator, a mic button, and
// Restart / End. Above the transcript sit the two dials:
//   • "Who does the steps?" (autonomy): three stops, Teacher · Helper ·
//     Autopilot, plus a 1–9 fine-tune slider
//   • "How familiar is this task?" (familiarity): first time · done it before ·
//     know it well

import { STOPS, bandOf, FAMILIARITY } from './agent.js';

const ROBOT = (antennas) => `
  <svg viewBox="0 0 40 40" width="34" height="34" aria-hidden="true">
    ${antennas.map((x) => `<line x1="${x}" y1="3" x2="${x}" y2="9" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><circle cx="${x}" cy="3.5" r="2.3" fill="currentColor"/>`).join('')}
    <rect x="5" y="9" width="30" height="26" rx="7" fill="currentColor"/>
    <circle cx="14" cy="20" r="2.6" fill="#fff"/><circle cx="26" cy="20" r="2.6" fill="#fff"/>
    <rect x="14" y="27" width="12" height="3" rx="1.5" fill="#fff"/>
  </svg>`;
const ICONS = { teacher: ROBOT([20]), helper: ROBOT([14, 26]), autopilot: ROBOT([10, 16, 24, 30]) };
const ROLE = {
  teacher: 'Teacher · guides you, you act',
  helper: 'Helper · you lead, I step in',
  autopilot: 'Autopilot · I act, you decide',
};
export const LEVEL_TEXT = {
  1: 'You do every step. I explain each one in detail and check in sooner.',
  2: 'You do every step. I point the way and explain why.',
  3: 'You do every step. If you get stuck, I\'ll offer to do that one.',
  4: 'You do the steps. I offer to do the "finding" steps, like searching.',
  5: 'You lead. Say "help" on any step and I\'ll do it, then hand back.',
  6: 'I do the "finding" steps. You make the choices and do the rest.',
  7: 'I find and do the steps. You make the choices.',
  8: 'I do the steps and ask you about choices.',
  9: 'I do the steps and pick suggested choices myself.',
};
const HANDBACK = 'At every setting, you type private details and make the final decision.';

const clock = () => new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });

export function createPanel(root, { canListen, canSpeak, tone, autonomy, familiarity, onSubmit, onMic, onRestart, onEnd, onTone, onSpeech, onDownload, onStart, onAutonomy, onFamiliarity, onChangeTask, onTestVoice = () => {}, onBrain = () => {}, onCollapse = () => {} }) {
  root.innerHTML = `
    <header class="agent-head">
      <span class="agent-icon" data-band="teacher">${ICONS.teacher}</span>
      <div class="agent-title"><div class="agent-name">Voice Agent</div><div class="agent-role">${ROLE.teacher}</div></div>
      <span class="ai-badge" hidden title="Running on an AI model">AI</span>
      <span class="live" aria-label="Session live">LIVE</span>
      <button type="button" class="collapse" aria-label="Hide the voice agent" title="Hide the voice agent"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" d="M9 6l6 6-6 6"/></svg></button>
      <button type="button" class="gear" aria-label="Settings" aria-expanded="false" aria-controls="agent-settings"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M19.4 13a7.6 7.6 0 0 0 0-2l2-1.6a.5.5 0 0 0 .1-.6l-1.9-3.3a.5.5 0 0 0-.6-.2l-2.4 1a7.3 7.3 0 0 0-1.7-1l-.4-2.5a.5.5 0 0 0-.5-.4h-3.8a.5.5 0 0 0-.5.4l-.4 2.5a7.3 7.3 0 0 0-1.7 1l-2.4-1a.5.5 0 0 0-.6.2L2.5 8.8a.5.5 0 0 0 .1.6l2 1.6a7.6 7.6 0 0 0 0 2l-2 1.6a.5.5 0 0 0-.1.6l1.9 3.3c.1.2.4.3.6.2l2.4-1c.5.4 1.1.7 1.7 1l.4 2.5c0 .2.3.4.5.4h3.8c.2 0 .5-.2.5-.4l.4-2.5c.6-.3 1.2-.6 1.7-1l2.4 1c.2.1.5 0 .6-.2l1.9-3.3a.5.5 0 0 0-.1-.6ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z"/></svg></button>
    </header>
    <div class="settings-sheet" id="agent-settings" role="dialog" aria-label="Settings" hidden>
    <div class="sheet-head"><h2>Settings</h2><button type="button" class="sheet-close" aria-label="Close settings">✕</button></div>
    <section class="dials brain-dial" aria-label="Agent brain">
      <div class="dial">
        <div class="dial-label" id="dl-brain">Agent brain</div>
        <div class="stops two" role="radiogroup" aria-labelledby="dl-brain">
          <button role="radio" class="stop" data-brain="scripted">Scripted</button>
          <button role="radio" class="stop" data-brain="ai">AI (Claude)</button>
        </div>
        <p class="dial-help brain-help">Scripted follows a written lesson. AI reads the page and decides each step itself, within the same dial and hand-back rules.</p>
      </div>
    </section>
    <section class="dials" aria-label="How the agent helps">
      <div class="dial">
        <div class="dial-label" id="dl-auto">Who does the steps?</div>
        <div class="stops" role="radiogroup" aria-labelledby="dl-auto">
          ${Object.entries(STOPS).map(([b, n]) => `<button role="radio" class="stop" data-band="${b}" data-level="${n}">${b[0].toUpperCase() + b.slice(1)}</button>`).join('')}
        </div>
        <div class="fine"><label for="auto-range">Fine-tune</label>
          <input id="auto-range" type="range" min="1" max="9" step="1" list="auto-ticks">
          <datalist id="auto-ticks">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<option value="${n}"></option>`).join('')}</datalist>
          <output class="auto-num" for="auto-range"></output></div>
        <p class="dial-help" aria-live="polite"></p>
      </div>
      <div class="dial">
        <div class="dial-label" id="dl-fam">How familiar is this task?</div>
        <div class="stops fam" role="radiogroup" aria-labelledby="dl-fam">
          ${FAMILIARITY.map((l, i) => `<button role="radio" class="stop" data-fam="${i}">${l}</button>`).join('')}
        </div>
      </div>
    </section>
    <section class="settings" aria-label="Voice and session">
      <div class="dial-label">Voice and session</div>
      <label>How I talk
        <select class="tone">
          <option value="auto">Match the dial (warm Teacher and Helper, brief Autopilot)</option>
          <option value="warm">Warm: encouraging, explains why</option>
          <option value="neutral">Neutral: explains why, no praise</option>
          <option value="minimal">Minimal: just the steps</option>
        </select></label>
      <label class="check"><input type="checkbox" class="speech" ${canSpeak ? 'checked' : 'disabled'}> Speak my replies aloud</label>
      <label>Speaking speed <input type="range" class="rate" min="0.7" max="1.3" step="0.05" value="0.95"></label>
      <button type="button" class="link test-voice">Test the voice</button>
      <button type="button" class="link change-task">Choose a different task</button>
      <button type="button" class="link download">Download session log (JSON)</button>
    </section>
    </div>
    <div class="transcript" role="log" aria-live="polite" aria-relevant="additions" aria-label="Conversation"></div>
    <div class="status-row" aria-hidden="true"><span class="speaking" hidden>Speaking…</span><span class="heard" hidden></span></div>
    <form class="composer">
      <label class="sr-only" for="say">Message to the agent</label>
      <input id="say" autocomplete="off" placeholder="Type, or press the mic to talk">
      <button type="submit" class="send" aria-label="Send">➤</button>
    </form>
    <div class="controls">
      <button type="button" class="mic" aria-pressed="false" ${canListen ? '' : 'disabled title="Voice input is not supported in this browser"'}>
        <span aria-hidden="true">🎙</span> <span class="mic-label">${canListen ? 'Voice: off' : 'No mic'}</span></button>
      <button type="button" class="secondary restart">Restart</button>
      <button type="button" class="danger end">End</button>
    </div>`;

  const $ = (s) => root.querySelector(s);
  const log = $('.transcript');
  const input = $('#say');
  const mic = $('.mic');
  const range = $('#auto-range');
  $('.tone').value = tone;

  function showAutonomy(level) {
    const band = bandOf(level);
    range.value = String(level);
    $('.auto-num').textContent = String(level);
    root.querySelectorAll('.stops:not(.fam):not(.two) .stop').forEach((b) => {
      const on = b.dataset.band === band;
      b.classList.toggle('on', on);
      b.setAttribute('aria-checked', String(on));
    });
    $('.dial-help').textContent = `${LEVEL_TEXT[level]} ${level >= 4 ? HANDBACK : ''}`.trim();
    const icon = $('.agent-icon');
    icon.dataset.band = band;
    icon.innerHTML = ICONS[band];
    $('.agent-role').textContent = ROLE[band];
    root.dataset.band = band;
  }
  function showFamiliarity(f) {
    root.querySelectorAll('.stops.fam .stop').forEach((b) => {
      const on = f != null && Number(b.dataset.fam) === f;
      b.classList.toggle('on', on);
      b.setAttribute('aria-checked', String(on));
    });
  }

  root.querySelectorAll('[data-brain]').forEach((b) => b.addEventListener('click', () => onBrain(b.dataset.brain)));
  root.querySelectorAll('.stops:not(.fam):not(.two) .stop').forEach((b) => b.addEventListener('click', () => { showAutonomy(Number(b.dataset.level)); onAutonomy(Number(b.dataset.level)); }));
  range.addEventListener('input', () => showAutonomy(Number(range.value)));
  range.addEventListener('change', () => onAutonomy(Number(range.value)));
  root.querySelectorAll('.stops.fam .stop').forEach((b) => b.addEventListener('click', () => { showFamiliarity(Number(b.dataset.fam)); onFamiliarity(Number(b.dataset.fam)); }));

  function add(role, text) {
    const empty = log.querySelector('.empty-state');
    if (empty) empty.remove();
    const m = root.ownerDocument.createElement('div');
    m.className = `msg ${role}`;
    m.innerHTML = `<div class="bubble"></div><div class="time">${clock()}</div>`;
    m.querySelector('.bubble').textContent = text;
    log.append(m);
    log.scrollTop = log.scrollHeight;
    return m;
  }

  // A line whose words appear as the voice speaks them. Screen readers get the
  // whole line at once (sr-only copy); the visible words fill in.
  function addSpoken(role, text) {
    const m = add(role, '');
    const b = m.querySelector('.bubble');
    const words = text.split(/(\s+)/);
    b.innerHTML = '<span class="sr-only"></span><span class="said" aria-hidden="true"></span><span class="unsaid" aria-hidden="true"></span>';
    b.querySelector('.sr-only').textContent = text;
    const said = b.querySelector('.said'), unsaid = b.querySelector('.unsaid');
    let shown = -1;
    const reveal = (frac) => {
      const n = Math.max(0, Math.min(words.length, Math.ceil(frac * words.length)));
      if (n === shown) return;
      shown = n;
      said.textContent = words.slice(0, n).join('');
      unsaid.textContent = words.slice(n).join('');
      if (dockCaption) dockCaption.textContent = said.textContent;
    };
    reveal(0);
    m.classList.add('speaking-now');
    return { reveal, done() { reveal(1); m.classList.remove('speaking-now'); } };
  }

  // What the person is saying, shown live while the mic listens.
  let liveUser = null;
  function setLiveUser(text) {
    if (!text) { if (liveUser) { liveUser.remove(); liveUser = null; } return; }
    if (!liveUser) { liveUser = add('user', ''); liveUser.classList.add('live-user'); }
    liveUser.querySelector('.bubble').textContent = text;
    log.scrollTop = log.scrollHeight;
  }
  function finishLiveUser(text) {
    if (liveUser) { liveUser.classList.remove('live-user'); liveUser.querySelector('.bubble').textContent = text; const m = liveUser; liveUser = null; return m; }
    return add('user', text);
  }

  // Collapsing: the panel hides and a small dock stays in the corner, with the
  // mic, the agent's current words, and a button to bring the panel back.
  const doc = root.ownerDocument;
  const dock = doc.createElement('div');
  dock.className = 'agent-dock';
  dock.hidden = true;
  dock.innerHTML = `<div class="dock-caption" aria-live="polite"></div>
    <div class="dock-row"><button type="button" class="dock-mic" ${canListen ? '' : 'disabled'} aria-label="Talk to the voice agent">🎙</button>
    <button type="button" class="dock-open" aria-label="Show the voice agent"><span class="dock-dot" aria-hidden="true"></span> Voice agent <span aria-hidden="true">‹</span></button></div>`;
  doc.body.append(dock);
  const dockCaption = dock.querySelector('.dock-caption');
  let captionTimer = 0;
  function collapse(on) {
    doc.body.classList.toggle('agent-collapsed', on);
    root.hidden = on;
    dock.hidden = !on;
    onCollapse(on);
    (on ? dock.querySelector('.dock-open') : $('.collapse')).focus({ preventScroll: true });
  }

  $('.composer').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = input.value.trim();
    if (!v) return;
    input.value = '';
    onSubmit(v);
  });
  // Tap to talk; listening ends by itself when the person pauses, or on a
  // second tap. (Tap rather than hold: holding a button while speaking is hard
  // for many people.)
  mic.addEventListener('click', () => onMic(mic.getAttribute('aria-pressed') !== 'true'));
  $('.restart').addEventListener('click', () => onRestart());
  $('.end').addEventListener('click', () => onEnd());
  $('.tone').addEventListener('change', (e) => onTone(e.target.value));
  $('.speech').addEventListener('change', (e) => onSpeech({ enabled: e.target.checked }));
  $('.rate').addEventListener('input', (e) => onSpeech({ rate: Number(e.target.value) }));
  $('.download').addEventListener('click', () => onDownload());
  $('.test-voice').addEventListener('click', () => onTestVoice());
  $('.collapse').addEventListener('click', () => collapse(true));
  dock.querySelector('.dock-open').addEventListener('click', () => collapse(false));
  dock.querySelector('.dock-mic').addEventListener('click', () => onMic(!mic.classList.contains('on')));
  $('.change-task').addEventListener('click', () => { openSettings(false); onChangeTask(); });

  // The settings sheet opens from the gear and closes with ✕, Esc or the gear.
  const gear = $('.gear');
  const sheet = $('.settings-sheet');
  function openSettings(open) {
    sheet.hidden = !open;
    gear.setAttribute('aria-expanded', String(open));
    root.classList.toggle('settings-open', open);
    if (open) (sheet.querySelector('.stop.on') || sheet.querySelector('.stop')).focus();
    else gear.focus({ preventScroll: true });
  }
  gear.addEventListener('click', () => openSettings(sheet.hidden));
  $('.sheet-close').addEventListener('click', () => openSettings(false));
  root.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !sheet.hidden) { e.stopPropagation(); openSettings(false); } });

  showAutonomy(autonomy);
  showFamiliarity(familiarity);

  return {
    add,
    addSpoken(role, text) {
      clearTimeout(captionTimer);
      dock.classList.add('has-caption');
      const h = addSpoken(role, text);
      return { reveal: h.reveal, done() { h.done(); captionTimer = setTimeout(() => dock.classList.remove('has-caption'), 6000); } };
    },
    setLiveUser,
    finishLiveUser,
    collapse,
    get collapsed() { return root.hidden; },
    clear() { log.innerHTML = ''; },
    /** The empty state for a task (or the picker when task is null). */
    intro(task) {
      log.innerHTML = task
        ? `<div class="empty-state"><p><strong>${task.title}</strong></p><p class="brief">${task.lesson.brief}</p>
            <p class="muted">Try saying or typing: “${task.prompt}”</p>
            <button class="secondary start-btn" type="button">Start</button></div>`
        : `<div class="empty-state"><p><strong>What would you like to do?</strong> Pick a task on the left, or tell me in your own words.</p>
            <p class="muted">Use the settings button (⚙) at the top to choose how much I do, and how much guidance you want.</p></div>`;
      const b = log.querySelector('.start-btn');
      if (b) b.addEventListener('click', () => onStart());
    },
    showAutonomy,
    showFamiliarity,
    setSpeaking(on) { $('.speaking').hidden = !on; },
    setThinking(on) {
      let t = root.querySelector('.thinking');
      if (!t) { t = root.ownerDocument.createElement('span'); t.className = 'thinking'; t.textContent = 'Thinking…'; $('.status-row').prepend(t); }
      t.hidden = !on;
    },
    setBrain(b) {
      root.querySelectorAll('[data-brain]').forEach((x) => { const on = x.dataset.brain === b; x.classList.toggle('on', on); x.setAttribute('aria-checked', String(on)); });
      $('.ai-badge').hidden = b !== 'ai';
    },
    setBrainAvailable(ok, model) {
      const btn = root.querySelector('[data-brain="ai"]');
      btn.classList.toggle('unavailable', !ok);
      $('.brain-help').textContent = ok
        ? `Scripted follows a written lesson. AI (${model}) reads the page and decides each step itself, within the same dial and hand-back rules.`
        : 'AI needs the local server with a Claude API key (see "AI agent" in the README). Scripted works everywhere.';
    },
    /** Voice input on/off (hands-free). `paused` while the agent is talking. */
    setListening(on, paused = false) {
      dock.querySelector('.dock-mic').classList.toggle('on', on);
      mic.classList.toggle('on', on);
      mic.classList.toggle('paused', on && paused);
      mic.setAttribute('aria-pressed', String(on));
      $('.mic-label').textContent = on ? (paused ? 'Voice: on (waiting)' : 'Voice: on · listening') : 'Voice: off';
      mic.title = on ? 'Tap to turn voice off' : 'Tap to turn voice on: then just talk, no need to tap again';
      if (!on) setLiveUser('');
    },
    /** Browsers need a tap before the mic can start, so after a reload we ask. */
    offerVoiceResume() {
      const m = add('system', '');
      m.querySelector('.bubble').innerHTML = 'Voice was on last time. <button type="button" class="link resume-voice">Turn voice on</button>';
      m.querySelector('.resume-voice').addEventListener('click', () => { onMic(true); m.remove(); });
    },
    setHeard(text) { const h = $('.heard'); h.hidden = !text; h.textContent = text ? `“${text}”` : ''; },
    setLive(state) { const l = $('.live'); l.classList.toggle('off', state !== 'live'); l.textContent = { live: 'LIVE', done: 'DONE', ended: 'ENDED' }[state] || 'LIVE'; },
    focusInput() { input.focus(); },
  };
}
