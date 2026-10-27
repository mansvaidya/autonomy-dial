// main.js — the host. It shows the task picker, mounts the chosen website,
// and wires the agent to it:
//
//   person acts on the site ─▶ site reports state ─▶ agent decides
//   agent's turn ─▶ panel speaks/shows it, guide points, and (only when the
//   dial gives the agent that step) hands act on the site
//
// URL options (handy for study sessions):
//   ?task=cake|menu              skip the picker
//   ?autonomy=1..9               starting dial (default 2, Teacher)
//   ?familiarity=0|1|2           starting familiarity (default: from history)
//   ?tone=auto|warm|neutral|minimal
//   ?stuck=25                    seconds of no activity before a gentle nudge
//   ?fresh=1                     ignore past completions
//   ?speed=1                     agent action speed (lower is faster)

import { createAgent, bandOf } from './agent.js';
import { createShop } from './shop.js';
import { createPlatewise } from './platewise.js';
import { createGuide } from './guide.js';
import { createHands, HandBackError } from './hands.js';
import { createPanel } from './panel.js';
import { createSensor } from './sensing.js';
import { createAiAgent } from './ai/ai-agent.js';
import { createSpeaker, createListener, canListen, canSpeak, LISTEN_ERRORS } from './voice.js';
import { birthdayCake } from './lessons/birthday-cake.js';
import { partyMenu } from './lessons/party-menu.js';

const TASKS = [
  { key: 'cake', lesson: birthdayCake, title: 'Order a birthday cake', site: 'Basketly · grocery delivery',
    img: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ae/Chocolate_mousse_cake_2.jpg/500px-Chocolate_mousse_cake_2.jpg',
    prompt: 'My granddaughter\'s birthday is this weekend and I\'d like to send her a cake, but I don\'t know where to start.' },
  { key: 'menu', lesson: partyMenu, title: 'Plan a party menu', site: 'Platewise · recipes and party planning',
    img: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/df/Eggplant_Lasagna_%28Vegitarian%29_%286_of_6%29.jpg/500px-Eggplant_Lasagna_%28Vegitarian%29_%286_of_6%29.jpg',
    prompt: 'I\'m having ten people over for a birthday. Two are vegetarian and one has a nut allergy. Can you help me plan the food?' },
];

const params = new URLSearchParams(location.search);
const num = (k, d, lo, hi) => { const v = Number(params.get(k)); return params.has(k) && Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : d; };
let tone = ['auto', 'warm', 'neutral', 'minimal'].includes(params.get('tone')) ? params.get('tone') : 'auto';
let autonomy = num('autonomy', 2, 1, 9);
let familiarity = params.has('familiarity') ? num('familiarity', 0, 0, 2) : null;
const stuckAfterMs = Math.max(5, Number(params.get('stuck')) || 35) * 1000;
const speed = Math.max(0.2, Number(params.get('speed')) || 1);

const doneKey = (id) => `teacher:${id}:completed`;
const history = {
  get(id) { if (params.get('fresh')) return 0; try { return Number(localStorage.getItem(doneKey(id))) || 0; } catch { return 0; } },
  bump(id) { try { localStorage.setItem(doneKey(id), String(this.get(id) + 1)); } catch {} },
};

const sessionLog = [];
// The conversation as it happened: who said what, when it was spoken, and how
// (typed or voice). Included in the downloaded log.
const transcript = [];
const iso = () => new Date().toISOString();
const record = (type, data = {}) => sessionLog.push({ t: new Date().toISOString(), type, task: task && task.key, autonomy, familiarity, ...data });

const shopEl = document.getElementById('shop');
const speaker = createSpeaker();
const guide = createGuide(document);
const hands = createHands(document, { speed });

// Which brain runs the agent: the scripted lessons, or an AI model (Claude)
// reached through the local server (server.js). ?brain=ai starts with the AI.
let brain = params.get('brain') === 'ai' ? 'ai' : 'scripted';
let aiStatus = { ai: false, model: null };
let ai = null;       // the AI agent, when brain === 'ai'
let micStartedAt = null;

let task = null;     // the chosen task
let site = null;     // the mounted website
let agent = null;
let completedCounted = false;
let scrollHintedStep = -1;
let actChain = Promise.resolve();
let driving = 0;

const panel = createPanel(document.getElementById('agent'), {
  canListen, canSpeak, tone, autonomy, familiarity,
  onSubmit: (text) => userSaid(text, 'typed'),
  onStart: () => { record('start'); if (ai) return ai.start(null); if (!agent) return; deliver(agent.start(Date.now())); },
  onMic: (on) => {
    if (!listener) return;
    if (on) { speaker.cancel(); micStartedAt = iso(); listener.start(); } else listener.stop();
    record('voice-input', { on });
    try { localStorage.setItem('agent-voice-on', on ? '1' : '0'); } catch {}
  },
  onCollapse: (on) => {
    record('panel', { collapsed: on });
    try { localStorage.setItem('agent-panel-collapsed', on ? '1' : '0'); } catch {}
    requestAnimationFrame(() => guide.refresh());
  },
  onRestart: () => (task ? openTask(task.key) : showPicker()),
  onEnd: () => userSaid('stop', 'button'),
  onTone: (t) => { tone = t; record('tone', { tone: t }); if (ai) ai.setTone(t); if (agent) deliver(agent.setTone(t)); },
  onSpeech: ({ enabled, rate }) => { if (enabled != null) speaker.enabled = enabled; if (rate != null) speaker.rate = rate; },
  onDownload: downloadLog,
  onAutonomy: (n) => { autonomy = n; record('autonomy', { level: n, band: bandOf(n) }); if (ai) ai.setAutonomy(n); if (agent) deliver(agent.setAutonomy(n, Date.now())); },
  onFamiliarity: (f) => { familiarity = f; record('familiarity', { level: f }); if (ai) ai.setFamiliarity(f); if (agent) deliver(agent.setFamiliarity(f)); },
  onBrain: (b) => {
    if (b === 'ai' && !aiStatus.ai) return panel.add('system', 'The AI agent needs the local server with a Claude API key. See "AI agent" in the README. The scripted agent still works.');
    brain = b; record('brain', { brain: b }); panel.setBrain(b);
    if (task) openTask(task.key);
  },
  onChangeTask: () => showPicker(),
  onTestVoice: () => {
    if (!canSpeak) return panel.add('system', 'This browser can\'t speak out loud. Replies will show as text.');
    speaker.enabled = true;
    speaker.speak('Hello! This is how I sound. If you can hear me, spoken replies are working.');
    setTimeout(() => panel.add('system', `Testing the voice${speaker.voiceName ? ` (${speaker.voiceName})` : ''}. If you heard nothing, check your computer's volume and that this tab isn't muted.`), 150);
  },
});
// While the agent speaks, hands-free listening pauses so it doesn't hear itself.
speaker.onSpeaking((on) => {
  panel.setSpeaking(on);
  if (!listener) return;
  if (on) listener.pause(); else setTimeout(() => { if (!speakingNow()) listener.resume(); }, 350);
});
const speakingNow = () => { try { return speechSynthesis.speaking || speechSynthesis.pending; } catch { return false; } };

const listener = createListener({
  onInterim: (t) => panel.setLiveUser(t),
  onFinal: (t) => { userSaid(t, 'voice'); micStartedAt = iso(); },
  onState: (s, err) => {
    panel.setListening(s === 'listening' || s === 'paused', s === 'paused');
    if (s === 'error' && err) { panel.setLiveUser(''); panel.add('system', LISTEN_ERRORS[err] || `Voice input stopped (${err}). You can type instead.`); record('mic-error', { error: err }); }
  },
});

// ── Task picker ──
function showPicker() {
  speaker.cancel();
  if (ai) ai.stop();
  task = null; agent = null; site = null; ai = null;
  guide.clear(); hands.clear();
  shopEl.innerHTML = `
    <div class="picker">
      <h1>What would you like to do today?</h1>
      <p class="muted">Pick a task. Each one opens its own website, and the agent on the right helps as much or as little as you set the dials.</p>
      <div class="picker-grid">${TASKS.map((t) => `
        <button class="task-card" data-task="${t.key}" data-guide="task-${t.key}">
          <img src="${t.img}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">
          <span class="task-site">${t.site}</span>
          <strong>${t.title}</strong>
          <span class="task-brief">${t.lesson.brief}</span>
        </button>`).join('')}</div>
      <p class="muted small">Demo websites for a research study. Nothing is bought, sent or saved.</p>
    </div>`;
  shopEl.setAttribute('aria-label', 'Choose a task');
  shopEl.querySelectorAll('[data-task]').forEach((b) => b.addEventListener('click', () => openTask(b.dataset.task)));
  panel.intro(null);
  panel.setLive('live');
  record('picker');
}

function openTask(key, { utterance } = {}) {
  task = TASKS.find((t) => t.key === key) || TASKS[0];
  speaker.cancel();
  guide.clear(); hands.clear();
  completedCounted = false;
  scrollHintedStep = -1;
  actChain = Promise.resolve();
  setDriving(false, true);
  if (ai) ai.stop();
  ai = null;
  const useAi = brain === 'ai' && aiStatus.ai;
  agent = useAi ? null : createAgent({ lesson: task.lesson, autonomy, familiarity, tone, timesCompleted: history.get(task.lesson.id), stuckAfterMs, pointing: params.get('point') || 'auto' });
  mountSite(task.lesson.site);
  if (useAi) ai = makeAi();
  panel.clear();
  panel.intro(task);
  panel.showFamiliarity(familiarity != null ? familiarity : history.get(task.lesson.id) ? null : 0);
  panel.setLive('live');
  record('task', { lesson: task.lesson.id, brain: ai ? 'ai' : 'scripted', model: ai ? aiStatus.model : null });
  if (utterance) { panel.add('user', utterance); if (ai) ai.start(utterance); else deliver(agent.start(Date.now(), utterance)); }
}

function makeAi() {
  const siteRootEl = () => shopEl.querySelector('.site');
  return createAiAgent({
    task, siteName: task.lesson.site === 'platewise' ? 'Platewise, a recipe and party-planning site' : 'Basketly, a grocery delivery marketplace',
    siteRoot: siteRootEl, hands, guide, autonomy, familiarity: familiarity == null ? 0 : familiarity, tone, stuckAfterMs,
    host: {
      say: (text) => { if (!text) return; speakLine(text, { queue: true, meta: { brain: 'ai' } }); },
      setThinking: (on) => panel.setThinking(on),
      setDriving: (on) => setDriving(on),
      record,
      onDone: () => { panel.setLive('done'); if (!completedCounted && task) { completedCounted = true; history.bump(task.lesson.id); } },
      onError: (msg) => panel.add('system', `The AI agent couldn't respond (${msg}). Try again, or switch to the scripted agent in Settings.`),
    },
  });
}

function mountSite(kind, { onReady } = {}) {
  shopEl.innerHTML = '';
  const el = document.createElement('div');
  el.className = 'site';
  shopEl.append(el);
  const onChange = (state) => {
    record('site', { state });
    if (ai) { ai.pageChanged(); return; }
    if (agent) deliver(agent.observe(state, Date.now()));
    guide.highlight(agent ? agent.currentHighlight() : null);
  };
  if (kind === 'platewise') {
    shopEl.setAttribute('aria-label', 'Platewise (demo recipe site)');
    site = createPlatewise(el, { onChange, onOpenBasketly: openBasketlyWithList });
  } else {
    shopEl.setAttribute('aria-label', 'Basketly (demo shop)');
    site = createShop(el, { onChange });
  }
  if (onReady) onReady(site);
  site.emit();
}

// The party list goes to Basketly: open the shop with those items in the cart.
function openBasketlyWithList(items) {
  agent = null; guide.clear();
  mountSite('basketly', { onReady: (s) => { const n = s.importList ? s.importList(items) : 0; panel.add('system', `Opened Basketly with ${n} item${n === 1 ? '' : 's'} from your list in the cart. Nothing is ordered until checkout.`); } });
  record('open-basketly', { items: items.length });
}

// Built-in uncertainty sensing (wait time near Teacher, quiet help near Helper).
createSensor(shopEl, {
  getTarget: () => (driving ? null : ai ? (ai.target || (ai.phase === 'active' && !ai.busy ? '*' : null)) : agent ? agent.currentTarget() : null),
  onSignal: (kind) => {
    if (driving) return;
    if (ai) { record('signal', { kind, brain: 'ai' }); return ai.signal(kind); }
    if (!agent) return;
    record('signal', { kind, step: agent.step && agent.step.id, revealed: agent.revealed });
    deliver(agent.signal(kind, Date.now()));
  },
});

// Any sign the person is working counts as activity, so nudges wait.
for (const ev of ['input', 'pointerdown', 'keydown', 'wheel']) {
  shopEl.addEventListener(ev, (e) => { if (agent && e.isTrusted) agent.activity(Date.now()); }, { passive: true });
}
shopEl.addEventListener('input', (e) => { if (ai && e.isTrusted) ai.typed(); });
setInterval(() => {
  if (ai) { if (!driving && !(listener && listener.listening)) ai.tick(); return; }
  if (!agent || driving) return;
  if (listener && listener.listening) return agent.activity(Date.now());
  const t = agent.tick(Date.now());
  if (t) { record('nudge', { step: t.stepIndex }); deliver(t); }
}, 1000);

function userSaid(text, via) {
  speaker.cancel();
  if (via === 'voice') panel.finishLiveUser(text); else panel.add('user', text);
  transcript.push({ who: 'person', text, via, at: iso(), ...(via === 'voice' ? { micStartedAt } : {}) });
  record('user', { text, via });
  if (ai) {
    if (/^\s*(stop|end|quit|cancel)\b/i.test(text)) { ai.stop(); panel.add('agent', 'Okay, we\'ll stop here.'); panel.setLive('ended'); return; }
    return ai.hear(text);
  }
  if (!agent) {
    const match = TASKS.find((t) => t.lesson.matches.test(text));
    if (match) return openTask(match.key, { utterance: text });
    return panel.add('agent', 'I can help you order a birthday cake, or plan a party menu. Which would you like? You can also pick one on the left.');
  }
  deliver(agent.hear(text, Date.now()));
}

function deliver(turn) {
  if (!turn) return;
  // A calm pause before the next instruction. If the person has already moved
  // on by then, a newer turn has replaced this one, so it's dropped.
  if (turn.delay && agent) {
    const forAgent = agent, step = turn.stepIndex;
    const d = turn.delay;
    delete turn.delay;
    setTimeout(() => { if (agent === forAgent && agent.stepIndex === step && agent.phase === 'active') deliver(turn); }, d);
    return;
  }
  const where = guide.highlight(turn.highlight);
  if (turn.reveal) record('reveal', { reason: turn.reveal, step: turn.stepIndex });
  let say = turn.say;
  // Off screen? Ask the person to scroll (only for steps they do).
  if (say && !turn.act && where.found && where.direction && scrollHintedStep !== turn.stepIndex) {
    say += where.direction === 'down' ? ' It\'s further down, so scroll down to find it.' : ' It\'s further up, so scroll up to find it.';
    scrollHintedStep = turn.stepIndex;
  }
  if (say) {
    speakLine(say, { queue: turn.band !== 'teacher', meta: { brain: 'scripted', step: turn.stepIndex, phase: turn.phase, highlight: turn.highlight, band: turn.band, level: turn.level, act: turn.act } });
  }
  if (turn.act) queueAct(turn.act);
  if (turn.phase !== 'choosing' && turn.familiarity != null) panel.showFamiliarity(turn.familiarity);
  if (turn.phase === 'done' && !completedCounted && task) { completedCounted = true; history.bump(task.lesson.id); }
  panel.setLive(turn.phase === 'done' ? 'done' : turn.phase === 'ended' ? 'ended' : 'live');
}

// ── The agent's hands (only for steps the dial gives it) ──
function queueAct(act) {
  const forAgent = agent;
  actChain = actChain.then(() => runAct(act, forAgent)).catch(() => {});
}
async function runAct(act, forAgent) {
  if (!agent || agent !== forAgent) return;
  const step = task.lesson.steps.find((s) => s.id === act.stepId);
  if (!step || typeof step.perform !== 'function') return deliver(agent.actFailed(Date.now()));
  setDriving(true);
  record('act', { step: act.stepId, value: act.value });
  let result;
  try {
    await hands.pause(500); // let the narration start first
    result = await step.perform(hands, act.value);
  } catch (e) {
    result = false;
    if (!(e instanceof HandBackError)) console.warn('agent action failed', e);
  } finally {
    setDriving(false);
  }
  if (!agent || agent !== forAgent) return;
  if (result === 'skip') return deliver(agent.stepSkipped(Date.now()));
  await hands.pause(350);
  // Still waiting on this same step? Then the action didn't achieve it.
  if (agent.awaiting === 'acting' && agent.step && agent.step.id === act.stepId) {
    record('act-failed', { step: act.stepId });
    deliver(agent.actFailed(Date.now()));
  }
}
function setDriving(on, reset = false) {
  driving = reset ? 0 : Math.max(0, driving + (on ? 1 : -1));
  shopEl.classList.toggle('agent-driving', driving > 0);
}

// Say a line: its words appear in the panel as the voice speaks them.
function speakLine(text, { queue = false, meta = {} } = {}) {
  const entry = { who: 'agent', text, at: iso(), brain: meta.brain };
  transcript.push(entry);
  record('agent', { text, ...meta });
  let bubble = null;
  speaker.speak(text, {
    queue,
    onStart: () => { bubble = panel.addSpoken('agent', text); entry.spokenStart = iso(); },
    onProgress: (f) => { if (bubble) bubble.reveal(f); },
    onEnd: ({ cancelled }) => {
      if (!bubble) bubble = panel.addSpoken('agent', text);
      bubble.done();
      entry.spokenEnd = iso();
      if (cancelled) entry.cutOff = true;
    },
  });
}

function downloadLog() {
  const blob = new Blob([JSON.stringify({ startedWith: { autonomy, familiarity, tone, stuckAfterMs, brain, model: aiStatus.model }, transcript, events: sessionLog }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `agent-session-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// Start.
const startTask = params.get('task');
if (startTask && TASKS.some((t) => t.key === startTask)) openTask(startTask); else showPicker();
panel.setBrain(brain);
// Hands-free voice stays on across reloads once the person turns it on.
try { if (listener && localStorage.getItem('agent-voice-on') === '1') panel.offerVoiceResume(); } catch {}
// Remember whether the person hid the panel (or start hidden with ?panel=hidden).
try { if (params.get('panel') === 'hidden' || localStorage.getItem('agent-panel-collapsed') === '1') panel.collapse(true); } catch {}
// Is the AI agent available? (Only when run with server.js and an API key.)
fetch('/api/status').then((r) => (r.ok ? r.json() : null)).catch(() => null).then((st) => {
  aiStatus = st && typeof st.ai === 'boolean' ? st : { ai: false, model: null };
  panel.setBrainAvailable(aiStatus.ai, aiStatus.model);
  if (brain === 'ai' && aiStatus.ai && task && !ai) openTask(task.key);
  if (brain === 'ai' && !aiStatus.ai) { brain = 'scripted'; panel.setBrain('scripted'); panel.add('system', 'The AI agent isn\'t available here (it needs the local server with a Claude API key), so the scripted agent is running.'); }
});

// For automated tests and study tooling.
window.__teacherDemo = { get ai() { return ai; }, get agent() { return agent; }, get teacher() { return agent; }, get site() { return site; }, guide, hands, log: sessionLog, openTask, showPicker };
