// main.js — wires the shop, the Teacher, the guide overlay and the voice panel.
//
// Flow: the PERSON acts on the shop → the shop reports its state → the Teacher
// decides what to say and what to point at → the panel speaks/shows it and the
// guide draws the highlight. Nothing in this loop can act on the shop.
//
// URL options (handy for study sessions):
//   ?tone=warm|neutral|minimal   starting tone (default warm)
//   ?stuck=25                    seconds of no activity before a gentle nudge
//   ?fresh=1                     treat this person as new (ignore past completions)

import { createTeacher } from './teacher.js';
import { createShop } from './shop.js';
import { createGuide } from './guide.js';
import { createPanel } from './panel.js';
import { createSpeaker, createListener, canListen, canSpeak } from './voice.js';
import { birthdayCake as lesson } from './lessons/birthday-cake.js';

const params = new URLSearchParams(location.search);
const startTone = ['warm', 'neutral', 'minimal'].includes(params.get('tone')) ? params.get('tone') : 'warm';
const stuckAfterMs = Math.max(5, Number(params.get('stuck')) || 25) * 1000;

const DONE_KEY = `teacher:${lesson.id}:completed`;
const store = {
  get() { if (params.get('fresh')) return 0; try { return Number(localStorage.getItem(DONE_KEY)) || 0; } catch { return 0; } },
  bump() { try { localStorage.setItem(DONE_KEY, String(this.get() + 1)); } catch {} },
};

const sessionLog = [];
const record = (type, data) => sessionLog.push({ t: new Date().toISOString(), type, ...data });

const speaker = createSpeaker();
const guide = createGuide(document);
let tone = startTone;
let completedCounted = false;
let scrollHintedStep = -1;
let teacher = makeTeacher();

function makeTeacher() {
  return createTeacher({ lesson, tone, timesCompleted: store.get(), stuckAfterMs });
}

const panel = createPanel(document.getElementById('agent'), {
  canListen, canSpeak, tone: startTone,
  onSubmit: (text) => userSaid(text, 'typed'),
  onStart: () => { record('start', {}); deliver(teacher.start(Date.now())); },
  onMic: (on) => { if (!listener) return; if (on) { speaker.cancel(); listener.start(); } else listener.stop(); },
  onRestart: restart,
  onEnd: () => userSaid('stop the lesson', 'button'),
  onTone: (t) => { tone = t; record('tone', { tone: t }); deliver(teacher.setTone(t)); },
  onSpeech: ({ enabled, rate }) => { if (enabled != null) speaker.enabled = enabled; if (rate != null) speaker.rate = rate; },
  onDownload: downloadLog,
});
speaker.onSpeaking((on) => panel.setSpeaking(on));

const listener = createListener({
  onInterim: (t) => panel.setHeard(t),
  onFinal: (t) => { panel.setHeard(''); userSaid(t, 'voice'); },
  onState: (s, err) => {
    panel.setListening(s === 'listening');
    if (s === 'error' && err && err !== 'no-speech' && err !== 'aborted') panel.add('system', `Voice input stopped (${err}). You can type instead.`);
  },
});

const shop = createShop(document.getElementById('shop'), {
  onChange: (state) => {
    record('shop', { state });
    deliver(teacher.observe(state, Date.now()));
    // The shop may have re-rendered: re-measure the highlight either way.
    guide.highlight(teacher.currentHighlight());
  },
});
shop.emit();

// Any sign the person is working counts as activity, so nudges wait.
for (const ev of ['input', 'pointerdown', 'keydown', 'wheel']) {
  document.getElementById('shop').addEventListener(ev, () => teacher.activity(Date.now()), { passive: true });
}
setInterval(() => {
  if (listener && listener.listening) return teacher.activity(Date.now());
  const t = teacher.tick(Date.now());
  if (t) { record('nudge', { step: t.stepIndex }); deliver(t); }
}, 1000);

function userSaid(text, via) {
  panel.add('user', text);
  record('user', { text, via });
  deliver(teacher.hear(text, Date.now()));
}

function deliver(turn) {
  if (!turn) return;
  const where = guide.highlight(turn.highlight);
  let say = turn.say;
  // Off screen? Ask the person to scroll; the Teacher never scrolls for them.
  if (say && where.found && where.direction && scrollHintedStep !== turn.stepIndex) {
    say += where.direction === 'down' ? ' It\'s further down the page, so scroll down to find it.' : ' It\'s further up the page, so scroll up to find it.';
    scrollHintedStep = turn.stepIndex;
  }
  if (say) {
    panel.add('agent', say);
    speaker.speak(say);
    record('agent', { text: say, step: turn.stepIndex, phase: turn.phase, highlight: turn.highlight, tone: turn.tone });
  }
  if (turn.phase === 'done' && !completedCounted) { completedCounted = true; store.bump(); }
  panel.setLive(turn.phase === 'done' ? 'done' : turn.phase === 'ended' ? 'ended' : 'live');
}

function restart() {
  record('restart', {});
  speaker.cancel();
  completedCounted = false;
  scrollHintedStep = -1;
  teacher = makeTeacher();
  guide.clear();
  panel.clear();
  panel.setLive('live');
  shop.reset();
}

function downloadLog() {
  const blob = new Blob([JSON.stringify({ lesson: lesson.id, startTone, stuckAfterMs, events: sessionLog }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `teacher-session-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// For automated tests and study tooling.
window.__teacherDemo = { get teacher() { return teacher; }, shop, guide, log: sessionLog };
