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
const stuckAfterMs = Math.max(5, Number(params.get('stuck')) || 25) * 1000;
const speed = Math.max(0.2, Number(params.get('speed')) || 1);

const doneKey = (id) => `teacher:${id}:completed`;
const history = {
  get(id) { if (params.get('fresh')) return 0; try { return Number(localStorage.getItem(doneKey(id))) || 0; } catch { return 0; } },
  bump(id) { try { localStorage.setItem(doneKey(id), String(this.get(id) + 1)); } catch {} },
};

const sessionLog = [];
const record = (type, data = {}) => sessionLog.push({ t: new Date().toISOString(), type, task: task && task.key, autonomy, familiarity, ...data });

const shopEl = document.getElementById('shop');
const speaker = createSpeaker();
const guide = createGuide(document);
const hands = createHands(document, { speed });

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
  onStart: () => { if (!agent) return; record('start'); deliver(agent.start(Date.now())); },
  onMic: (on) => { if (!listener) return; if (on) { speaker.cancel(); listener.start(); } else listener.stop(); },
  onRestart: () => (task ? openTask(task.key) : showPicker()),
  onEnd: () => userSaid('stop', 'button'),
  onTone: (t) => { tone = t; record('tone', { tone: t }); if (agent) deliver(agent.setTone(t)); },
  onSpeech: ({ enabled, rate }) => { if (enabled != null) speaker.enabled = enabled; if (rate != null) speaker.rate = rate; },
  onDownload: downloadLog,
  onAutonomy: (n) => { autonomy = n; record('autonomy', { level: n, band: bandOf(n) }); if (agent) deliver(agent.setAutonomy(n, Date.now())); },
  onFamiliarity: (f) => { familiarity = f; record('familiarity', { level: f }); if (agent) deliver(agent.setFamiliarity(f)); },
  onChangeTask: () => showPicker(),
  onTestVoice: () => {
    if (!canSpeak) return panel.add('system', 'This browser can\'t speak out loud. Replies will show as text.');
    speaker.enabled = true;
    speaker.speak('Hello! This is how I sound. If you can hear me, spoken replies are working.');
    setTimeout(() => panel.add('system', `Testing the voice${speaker.voiceName ? ` (${speaker.voiceName})` : ''}. If you heard nothing, check your computer's volume and that this tab isn't muted.`), 150);
  },
});
speaker.onSpeaking((on) => panel.setSpeaking(on));

const listener = createListener({
  onInterim: (t) => panel.setHeard(t),
  onFinal: (t) => { panel.setHeard(''); userSaid(t, 'voice'); },
  onState: (s, err) => {
    panel.setListening(s === 'listening');
    if (s === 'error' && err) { panel.setHeard(''); panel.add('system', LISTEN_ERRORS[err] || `Voice input stopped (${err}). You can type instead.`); record('mic-error', { error: err }); }
  },
});

// ── Task picker ──
function showPicker() {
  speaker.cancel();
  task = null; agent = null; site = null;
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
  agent = createAgent({ lesson: task.lesson, autonomy, familiarity, tone, timesCompleted: history.get(task.lesson.id), stuckAfterMs });
  mountSite(task.lesson.site);
  panel.clear();
  panel.intro(task);
  panel.showFamiliarity(familiarity != null ? familiarity : history.get(task.lesson.id) ? null : 0);
  panel.setLive('live');
  record('task', { lesson: task.lesson.id });
  if (utterance) { panel.add('user', utterance); deliver(agent.start(Date.now(), utterance)); }
}

function mountSite(kind, { onReady } = {}) {
  shopEl.innerHTML = '';
  const el = document.createElement('div');
  el.className = 'site';
  shopEl.append(el);
  const onChange = (state) => {
    record('site', { state });
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
  getTarget: () => (agent && !driving ? agent.currentTarget() : null),
  onSignal: (kind) => {
    if (!agent || driving) return;
    record('signal', { kind, step: agent.step && agent.step.id, revealed: agent.revealed });
    deliver(agent.signal(kind, Date.now()));
  },
});

// Any sign the person is working counts as activity, so nudges wait.
for (const ev of ['input', 'pointerdown', 'keydown', 'wheel']) {
  shopEl.addEventListener(ev, (e) => { if (agent && e.isTrusted) agent.activity(Date.now()); }, { passive: true });
}
setInterval(() => {
  if (!agent || driving) return;
  if (listener && listener.listening) return agent.activity(Date.now());
  const t = agent.tick(Date.now());
  if (t) { record('nudge', { step: t.stepIndex }); deliver(t); }
}, 1000);

function userSaid(text, via) {
  speaker.cancel();
  panel.add('user', text);
  record('user', { text, via });
  if (!agent) {
    const match = TASKS.find((t) => t.lesson.matches.test(text));
    if (match) return openTask(match.key, { utterance: text });
    return panel.add('agent', 'I can help you order a birthday cake, or plan a party menu. Which would you like? You can also pick one on the left.');
  }
  deliver(agent.hear(text, Date.now()));
}

function deliver(turn) {
  if (!turn) return;
  const where = guide.highlight(turn.highlight);
  if (turn.reveal) record('reveal', { reason: turn.reveal, step: turn.stepIndex });
  let say = turn.say;
  // Off screen? Ask the person to scroll (only for steps they do).
  if (say && !turn.act && where.found && where.direction && scrollHintedStep !== turn.stepIndex) {
    say += where.direction === 'down' ? ' It\'s further down, so scroll down to find it.' : ' It\'s further up, so scroll up to find it.';
    scrollHintedStep = turn.stepIndex;
  }
  if (say) {
    panel.add('agent', say);
    speaker.speak(say, { queue: turn.band !== 'teacher' });
    record('agent', { text: say, step: turn.stepIndex, phase: turn.phase, highlight: turn.highlight, band: turn.band, level: turn.level, act: turn.act });
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

function downloadLog() {
  const blob = new Blob([JSON.stringify({ startedWith: { autonomy, familiarity, tone, stuckAfterMs }, events: sessionLog }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `agent-session-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// Start.
const startTask = params.get('task');
if (startTask && TASKS.some((t) => t.key === startTask)) openTask(startTask); else showPicker();

// For automated tests and study tooling.
window.__teacherDemo = { get agent() { return agent; }, get teacher() { return agent; }, get site() { return site; }, guide, hands, log: sessionLog, openTask, showPicker };
