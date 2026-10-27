// teacher.js — the Teacher lesson engine. Pure: no DOM, no timers, no speech.
//
// The Teacher guides; the person acts. This engine never produces an action on
// the page. Every method returns a Turn describing only what to SAY and what to
// HIGHLIGHT, and the host (main.js) delivers it:
//
//   { say: string|null, highlight: {target, level}|null, phase, stepIndex }
//
// Inputs, all driven by the host:
//   start(now)              — the person asked for help; open the lesson
//   observe(appState, now)  — the app changed because the PERSON did something
//   hear(utterance, now)    — the person spoke or typed to the Teacher
//   tick(now)               — time passed; may produce a gentle nudge
//
// Behaviour drawn from the paper's Teacher persona and its design guidelines:
//   • proactive next step: as soon as a step is done, the next one is given
//   • friction is a teaching moment: hints get more specific and the highlight
//     brighter, but the Teacher never takes over
//   • at most two unprompted nudges per step, so it doesn't nag (older adults'
//     dislike of unsolicited intervention is a design constraint, not an edge case)
//   • sensitive steps (address, payment) are always typed by the person
//   • familiarity: a person who has done the lesson before is OFFERED shorter
//     reminders; they choose (DG1, DG3: offer, don't impose)
//   • tone is a separate setting from guidance (DG2; see persona.js)

import { createVoice } from './persona.js';

export const PHASES = ['idle', 'choosing', 'teaching', 'done', 'ended'];

const MAX_NUDGES_PER_STEP = 2;

/** Map one utterance to what the person wants. Order matters. Exported for tests. */
export function parseUtterance(raw) {
  const u = String(raw || '').toLowerCase().replace(/[’']/g, "'").trim();
  if (!u) return 'unknown';
  if (/\b(do it for me|click (it|that|this)?\s*for me|(can|could|would) you (just )?(do|click|press|type|fill|order|buy|finish)|you do it|take over|just do it)\b/.test(u)) return 'act';
  if (/\b(stop|end|quit|exit)\b( (the )?(lesson|this|now))?$/.test(u) || /^(stop|end|quit|cancel)\b/.test(u)) return 'stop';
  if (/\b(shorter|less detail|talk less|too much talking|too long|briefer|quicker|faster|short reminders?|just (the )?reminders?)\b/.test(u)) return 'shorter';
  if (/\b(more detail|explain more|tell me more|slower|full walkthrough|walk me through|the full)\b/.test(u)) return 'longer';
  if (/\bwhy\b/.test(u)) return 'why';
  if (/\b(can'?t find|cannot find|where|stuck|lost|confused|don'?t see|do not see|can'?t see|not sure|no idea|help me|hint|i can'?t|i don'?t know)\b/.test(u)) return 'hint';
  if (/\b(what can i say|what can you do|commands|options)\b/.test(u)) return 'menu';
  if (/\b(repeat|again|say that|what was that|pardon|what do i do|what now|what's next|what next)\b/.test(u)) return 'repeat';
  if (/\b(done|did it|finished|i'?m there|got it|next|i clicked|i typed|i picked|i chose|ready)\b/.test(u)) return 'done';
  if (/^(yes|yeah|yep|sure|ok|okay|sounds good|let'?s (do it|go|start)|start|go ahead|please)\b/.test(u)) return 'yes';
  if (/^(no|nope|not now|maybe later)\b/.test(u)) return 'no';
  if (/\bhelp\b/.test(u)) return 'hint';
  return 'unknown';
}

/**
 * @param {Object} opts
 * @param {Object} opts.lesson            A lesson plan (see lessons/birthday-cake.js).
 * @param {'warm'|'neutral'|'minimal'} [opts.tone]
 * @param {number} [opts.timesCompleted]  How often this person finished this lesson before.
 * @param {number} [opts.stuckAfterMs]    Quiet time before a gentle nudge.
 */
export function createTeacher({ lesson, tone = 'warm', timesCompleted = 0, stuckAfterMs = 25000 } = {}) {
  if (!lesson || !Array.isArray(lesson.steps) || !lesson.steps.length) throw new Error('createTeacher: a lesson with steps is required');
  const voice = createVoice(tone);
  const steps = lesson.steps;

  let phase = 'idle';
  let ix = 0;
  let hintLevel = 0;      // per step: 0 = normal highlight; rises with friction
  let nudges = 0;         // unprompted nudges given on this step
  let lastActivity = 0;
  let appState = null;
  let shortMode = false;  // short reminders instead of full explanations
  let assisted = false;   // the person needed hints at some point
  let offTrack = false;
  const seen = new Set(); // steps whose goal was ever reached

  const current = () => steps[ix] || null;
  const withWhy = () => voice.explainsByDefault() && !shortMode;
  const hl = (level = hintLevel) => {
    const s = current();
    if (!s || phase !== 'teaching') return null;
    if (offTrack && s.view && appState && appState.view !== s.view) return s.getBackTarget ? { target: s.getBackTarget, level: 1 } : null;
    return { target: s.target, level };
  };
  const turn = (say, highlight = hl()) => ({ say: say || null, highlight, phase, stepIndex: ix, tone: voice.tone });
  const touch = (now) => { if (typeof now === 'number') lastActivity = now; };

  function resetStep() { hintLevel = 0; nudges = 0; offTrack = false; }

  function beginTeaching(now, prefix) {
    phase = 'teaching';
    ix = 0; resetStep(); touch(now);
    // The person may already be partway (e.g. they searched before asking).
    if (appState) advanceFrom(appState);
    if (ix >= steps.length) return finish();
    const first = voice.step(current(), { withWhy: withWhy(), short: shortMode });
    return turn([prefix, first].filter(Boolean).join(' '));
  }

  // Move past each step, in order, whose goal is now met. Steps the person did
  // ahead of the Teacher are covered because a step's doneWhen also accepts
  // later evidence (e.g. "size chosen OR the cake is already in the cart").
  // Advancing strictly in order means doing a later step early (typing the
  // message before choosing a size) never skips the earlier one.
  // Returns how many steps moved.
  const holds = (fn, state) => { try { return !!fn(state); } catch { return false; } };
  function advanceFrom(state) {
    steps.forEach((s, k) => { if (holds(s.learnedWhen || s.doneWhen, state)) seen.add(k); });
    const from = ix;
    while (ix < steps.length && holds(steps[ix].doneWhen, state)) ix++;
    if (ix !== from) resetStep();
    return ix - from;
  }

  function finish() {
    phase = 'done';
    const recap = steps.filter((s, k) => seen.has(k)).map((s) => s.learned).filter(Boolean);
    return turn(voice.close({ ...lesson, recap }, { assisted }), null);
  }

  function hint(now) {
    const s = current();
    assisted = true;
    touch(now);
    const say = voice.hint(s, hintLevel);
    hintLevel = Math.min(hintLevel + 1, 2);
    return turn(say, hl(Math.max(hintLevel, 1)));
  }

  return {
    get phase() { return phase; },
    get stepIndex() { return ix; },
    get step() { return current(); },
    get tone() { return voice.tone; },
    get shortMode() { return shortMode; },
    /** The highlight the host should (re)apply after the app re-renders. */
    currentHighlight: () => hl(),

    setTone(next) { voice.setTone(next); return turn(null); },

    /** The person is doing something (typing, scrolling): don't nudge yet. */
    activity(now) { touch(now); },

    start(now) {
      touch(now);
      if (phase === 'teaching') return turn(voice.step(current(), { withWhy: withWhy(), short: shortMode }));
      if (timesCompleted > 0) { phase = 'choosing'; return turn(voice.familiarOffer(lesson), null); }
      return beginTeaching(now, voice.intro(lesson));
    },

    observe(state, now) {
      const prev = appState;
      appState = state;
      touch(now);
      if (phase !== 'teaching') return null;

      const moved = advanceFrom(state);
      if (moved > 0) {
        if (ix >= steps.length) return finish();
        const praise = voice.praise();
        return turn([praise, voice.step(current(), { withWhy: withWhy(), short: shortMode })].filter(Boolean).join(' '));
      }

      const s = current();
      if (s.view && state.view !== s.view) {
        if (!offTrack) { offTrack = true; return turn(voice.offTrack(s)); }
        return null;
      }
      if (offTrack) {
        offTrack = false;
        return turn(voice.step(s, { withWhy: false, short: true }));
      }
      // Same step, the person is working on it (typing, scrolling): stay quiet.
      if (prev && prev.view !== state.view) return turn(null);
      return null;
    },

    hear(utterance, now) {
      touch(now);
      const intent = parseUtterance(utterance);

      if (phase === 'idle') {
        if (intent === 'no') return turn(`Okay. I'm here whenever you'd like to try.`, null);
        if (intent === 'menu') return turn(`I can teach you ${lesson.title.toLowerCase()}. Say "let's start" when you're ready.`, null);
        if (intent === 'act') return turn(voice.declineToAct(null) + ` Say "let's start" and I'll show you how.`, null);
        return this.start(now);
      }
      if (phase === 'choosing') {
        if (intent === 'shorter' || intent === 'done') shortMode = true;
        else if (intent === 'longer' || intent === 'yes') shortMode = false;
        else if (intent === 'no' || intent === 'stop') { phase = 'ended'; return turn(voice.ended(), null); }
        else return turn(voice.familiarOffer(lesson), null);
        return beginTeaching(now, shortMode ? 'Short reminders it is.' : 'Okay, the full walkthrough.');
      }
      if (phase === 'done' || phase === 'ended') {
        if (intent === 'yes' || /\b(again|restart|start over)\b/i.test(utterance)) { seen.clear(); assisted = false; return beginTeaching(now, voice.intro(lesson)); }
        return turn(phase === 'done' ? `You've finished this lesson. Say "start over" to practise again.` : voice.ended(), null);
      }

      // phase === 'teaching'
      const s = current();
      switch (intent) {
        case 'act':     return turn(voice.declineToAct(s), hl(Math.max(hintLevel, 1)));
        case 'why':     return turn(voice.why(s));
        case 'hint':    return hint(now);
        case 'repeat':  return turn(voice.step(s, { withWhy: withWhy(), short: false }));
        case 'menu':    return turn(voice.menu());
        case 'stop':    phase = 'ended'; return turn(voice.ended(), null);
        case 'shorter':
          // Less talk, same guidance: tone is a separate setting (DG2).
          shortMode = true;
          return turn(`Okay, I'll keep it short. ${voice.step(s, { withWhy: false, short: true })}`);
        case 'longer':
          shortMode = false;
          return turn(voice.step(s, { withWhy: true, short: false }));
        case 'done': {
          if (appState && s.doneWhen(appState)) return this.observe(appState, now);
          hintLevel = Math.max(hintLevel, 1);
          return turn(voice.notYet(s), hl(1));
        }
        default:
          return turn(`I'm here to guide you through this. ${voice.step(s, { withWhy: false, short: true })} ${voice.menu()}`);
      }
    },

    tick(now) {
      if (phase !== 'teaching' || typeof now !== 'number') return null;
      if (now - lastActivity < stuckAfterMs) return null;
      if (nudges >= MAX_NUDGES_PER_STEP) return null;
      nudges += 1;
      lastActivity = now;
      if (nudges === 1) { hintLevel = Math.max(hintLevel, 1); return turn(voice.stuckCheck(current()), hl(1)); }
      return hint(now);
    },
  };
}
