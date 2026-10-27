// agent.js — the voice agent's lesson engine, with two dials. Pure: no DOM, no
// timers, no speech. Every method returns a Turn for the host to deliver:
//
//   { say, highlight: {target, level}|null, act: {stepId, value}|null,
//     phase, stepIndex, band, level }
//
// `act` is the ONLY way the agent can change the page, and the host carries it
// out with the hands (hands.js). The engine never emits `act` for a step the
// person must do.
//
// ── Autonomy dial (1–9), "What Moves the Dial?" DG1 ──────────────────────────
// Each lesson step is tagged with the kind of responsibility it is:
//   find     getting to the right place (choose a store, search, open an item)
//   choose   a decision (size, message, which dish)
//   do       a routine action (add to cart, open the cart, go to checkout)
//   private  typing private details (address)      → ALWAYS the person
//   commit   the final, hard-to-undo decision       → ALWAYS the person
// Turning the dial up hands more kinds to the agent:
//
//   1  Teacher+   person does everything; extra explanation, earlier nudges
//   2  Teacher    person does everything; agent teaches (the paper's Teacher)
//   3  Teacher    as 2, but when you're stuck it offers to do that one step
//   4  Helper     offers to do each "find" step; offers help when stuck
//   5  Helper     you lead; say "help" and it does that step, then hands back
//                 (the paper's Helper)
//   6  Helper     agent does "find" steps; you choose and do the rest
//   7  Autopilot  agent finds and does; you make the choices
//   8  Autopilot  agent finds, chooses (asking you) and does
//                 (the paper's Autopilot)
//   9  Autopilot  as 8, but takes suggested choices without asking
//
// ── Familiarity dial ─────────────────────────────────────────────────────────
//   0 first time  full instructions with reasons
//   1 some        full instructions; reasons when asked
//   2 familiar    short reminders; nudges wait longer

import { createVoice } from './persona.js';

export const STOPS = { teacher: 2, helper: 5, autopilot: 8 };
export const FAMILIARITY = ['First time', 'Done it before', 'Know it well'];
const MAX_NUDGES_PER_STEP = 2;
// When to point at the target: 'now' (as soon as the step is given), 'wait'
// (after a short wait time, or sooner if the person seems unsure), 'unsure'
// (only when the person seems unsure, asks, or gets stuck).
export const POINTING = ['now', 'wait', 'unsure'];
const SIGNAL_WEIGHT = { 'empty-click': 1, 'other-control': 0.5, wander: 1, 'scroll-hunt': 1 };
const clamp = (n, a, b) => Math.min(b, Math.max(a, Math.round(Number(n) || a)));

export function bandOf(level) { return level <= 3 ? 'teacher' : level <= 6 ? 'helper' : 'autopilot'; }

/** Who does a step of a given kind at a given dial level. */
export function policyFor(level) {
  const L = clamp(level, 1, 9);
  const agentKinds = new Set([...(L >= 6 ? ['find'] : []), ...(L >= 7 ? ['do'] : []), ...(L >= 8 ? ['choose'] : [])]);
  return {
    level: L,
    band: bandOf(L),
    owner(kind) {
      if (kind === 'private' || kind === 'commit') return 'user';
      if (agentKinds.has(kind)) return 'agent';
      if (L === 4 && kind === 'find') return 'offer';
      return 'user';
    },
    // What happens when the person is stuck on their own step.
    rescue: L <= 2 ? 'teach' : L <= 4 ? 'offer' : 'take',
    // An explicit "do it for me".
    honorsAct: L >= 3,
    autoChoose: L >= 9,
    extraGuidance: L === 1,
    // Built-in wait time and uncertainty sensing (see signal()):
    //   Teacher waits a few seconds so you can try first, sooner if you seem
    //   unsure, then teaches; Helper stays quiet and only points when you seem
    //   unsure, then offers to do the step; Autopilot points right away (the
    //   person's steps there are hand-backs).
    pointing: L <= 4 ? 'wait' : L <= 6 ? 'unsure' : 'now',
    waitScale: L === 1 ? 0.5 : L === 4 ? 1.5 : 1,
  };
}

/** Map one utterance to what the person wants. Order matters. Exported for tests. */
export function parseUtterance(raw) {
  const u = String(raw || '').toLowerCase().replace(/[’']/g, "'").trim();
  if (!u) return 'unknown';
  if (/\b(i'?ll (do|try)|let me (do|try)|my turn|i want to (do|try)|i can do it|i'?ll take it)\b/.test(u)) return 'mine';
  if (/\bjust (place|send|order|finish|submit|do)\b|\b(place|send|submit) (it|the order|the list|my order) for me\b/.test(u)) return 'act';
  if (/\b(do it for me|click (it|that|this)?\s*for me|(can|could|would) you (just )?(do|click|press|type|fill|order|buy|finish|handle)|you do it|take over|just do it|do this (one|step))\b/.test(u)) return 'act';
  if (/\b(stop|end|quit|exit)\b( (the )?(lesson|this|now))?$/.test(u) || /^(stop|end|quit|cancel)\b/.test(u)) return 'stop';
  if (/\b(shorter|less detail|talk less|too much talking|too long|briefer|quicker|faster|short reminders?|just (the )?reminders?)\b/.test(u)) return 'shorter';
  if (/\b(more detail|explain more|tell me more|slower|full walkthrough|walk me through|the full)\b/.test(u)) return 'longer';
  if (/\bwhy\b/.test(u)) return 'why';
  if (/\b(can'?t find|cannot find|where|stuck|lost|confused|don'?t see|do not see|can'?t see|not sure|no idea|help me|hint|i can'?t|i don'?t know)\b/.test(u)) return 'hint';
  if (/\b(what can i say|what can you do|commands|options)\b/.test(u)) return 'menu';
  if (/\b(repeat|again|say that|what was that|pardon|what do i do|what now|what's next|what next)\b/.test(u)) return 'repeat';
  if (/^(yes|yeah|yep|sure|ok|okay|sounds good|please do|go ahead|let'?s (do it|go|start)|start|do it|that'?s fine|fine|perfect|great)\b/.test(u)) return 'yes';
  if (/^(no|nope|not now|maybe later|something else|another|different)\b/.test(u)) return 'no';
  if (/\b(done|did it|finished|i'?m there|got it|next|i clicked|i typed|i picked|i chose|ready)\b/.test(u)) return 'done';
  if (/\bhelp\b/.test(u)) return 'hint';
  return 'unknown';
}

/**
 * @param {Object} opts
 * @param {Object} opts.lesson
 * @param {number} [opts.autonomy]     1–9 (default 2, Teacher)
 * @param {number|null} [opts.familiarity]  0–2, or null to decide from history
 * @param {string} [opts.tone]         'auto' | 'warm' | 'neutral' | 'minimal'
 * @param {number} [opts.timesCompleted]
 * @param {number} [opts.stuckAfterMs]
 */
export function createAgent({ lesson, autonomy = 2, familiarity = null, tone = 'auto', timesCompleted = 0, stuckAfterMs = 25000, pointing = 'auto' } = {}) {
  if (!lesson || !Array.isArray(lesson.steps) || !lesson.steps.length) throw new Error('createAgent: a lesson with steps is required');
  const voice = createVoice(tone);
  const steps = lesson.steps;

  let policy = policyFor(autonomy);
  voice.setBand(policy.band);
  let fam = familiarity == null ? null : clamp(familiarity, 0, 2);

  let phase = 'idle';
  let ix = 0;
  let hintLevel = 0;
  let nudges = 0;
  let lastActivity = 0;
  let appState = null;
  let assisted = false;
  let offTrack = false;
  let pending = null;          // {type:'offer'|'rescue'|'ask'|'acting', ix}
  let lastActor = 'person';    // who completed the previous step
  const taken = new Set();     // steps the person claimed ("I'll do it"), or the agent failed
  const doneBy = new Map();    // step index → 'person' | 'agent'
  const prefill = {};          // choices given up front ("a 10 inch cake")
  const watched = new Set();
  // Wait time: whether the current step's target is shown yet.
  const pointOverride = POINTING.includes(pointing) ? pointing : null; // 'auto' follows the dial
  const pointMode = () => pointOverride || policy.pointing;
  let revealed = true;
  let revealNote = null;      // why it was just shown, for the session log (one-shot)
  let enteredIx = -1;
  let stepStart = 0;
  let unsure = 0;             // accumulated signs of uncertainty on this step

  const current = () => steps[ix] || null;
  const famLevel = () => (fam == null ? 0 : fam);
  const withWhy = () => policy.extraGuidance || (famLevel() === 0 && voice.explainsByDefault());
  const short = () => famLevel() === 2;
  const owner = (k = ix) => (taken.has(k) ? 'user' : policy.owner(steps[k].kind || 'do'));
  const holds = (fn, state) => { try { return !!fn(state); } catch { return false; } };
  const targetOf = (s) => (typeof s.target === 'function' ? s.target(appState || {}) : s.target);

  function hl(level = hintLevel) {
    const s = current();
    if (!s || phase !== 'active') return null;
    if (offTrack && s.view && appState && !viewOk(s, appState)) return s.getBackTarget ? { target: s.getBackTarget, level: 1 } : null;
    if (pending && pending.type === 'acting') return { target: targetOf(s), level: 'agent' };
    if (!revealed) return null; // wait time: let the person try first
    return { target: targetOf(s), level };
  }
  // Show the target now (the person asked, got stuck, or seems unsure).
  function show(level, why) {
    if (!revealed) { revealed = true; revealNote = why; }
    return hl(level);
  }
  const turn = (say, highlight = hl(), act = null) => {
    const reveal = revealNote; revealNote = null;
    return {
      say: say || null, highlight, act, phase, stepIndex: ix, band: policy.band, level: policy.level, tone: voice.effectiveTone,
      familiarity: famLevel(), awaiting: pending ? pending.type : null, pointing: pointMode(), reveal,
    };
  };
  const waitMs = () => [4000, 6000, 9000][famLevel()] * (pointOverride ? 1 : policy.waitScale);
  const touch = (now) => { if (typeof now === 'number') lastActivity = now; };
  const viewOk = (s, st) => !s.view || (Array.isArray(s.view) ? s.view.includes(st.view) : st.view === s.view);
  const join = (...parts) => parts.filter(Boolean).join(' ');

  function resetStep() { hintLevel = 0; nudges = 0; offTrack = false; pending = null; unsure = 0; }

  // Begin the current step under the current policy. `prefix` is spoken first.
  function enter(prefix, now) {
    touch(now);
    const s = current();
    if (!s) return finish();
    const who = owner();

    if (who === 'agent') {
      if (s.kind === 'choose') {
        let value = prefill[s.id];
        if (value === undefined && policy.autoChoose && s.suggest) value = s.suggest(appState || {});
        if (value === undefined || value === null) {
          pending = { type: 'ask', ix };
          return turn(join(prefix, typeof s.ask === 'function' ? s.ask(appState || {}) : s.ask), { target: targetOf(s), level: 0 });
        }
        return actNow(prefix, value);
      }
      return actNow(prefix);
    }
    if (who === 'offer') {
      pending = { type: 'offer', ix };
      return turn(join(prefix, voice.offer(s)));
    }
    // The person's step. Wait time: unless pointing is "right away", the target
    // stays hidden at first, so the person can try from the spoken instruction.
    pending = null;
    if (enteredIx !== ix) {
      enteredIx = ix;
      stepStart = typeof now === 'number' ? now : lastActivity;
      unsure = 0;
      const handBack = (s.kind === 'private' || s.kind === 'commit') && policy.band !== 'teacher';
      revealed = pointMode() === 'now' || handBack;
    }
    const yourTurn = lastActor === 'agent' && policy.band !== 'teacher';
    if ((s.kind === 'private' || s.kind === 'commit') && policy.band !== 'teacher') {
      return turn(join(prefix, voice.handBack(s, { short: short() })));
    }
    let say = voice.step(s, { withWhy: withWhy(), short: short(), yourTurn });
    if (s.kind === 'private') say = join(say, voice.privacyNote());
    return turn(join(prefix, say));
  }

  function actNow(prefix, value, { takeover = false } = {}) {
    const s = current();
    if (s.kind === 'private' || s.kind === 'commit') return turn(join(prefix, voice.declinePrivate(s)), show(1, 'asked'));
    pending = { type: 'acting', ix };
    return turn(join(prefix, voice.narrate(s, value, { takeover })), { target: targetOf(s), level: 'agent' }, { stepId: s.id, value: value === undefined ? null : value });
  }

  function begin(now, prefix) {
    phase = 'active';
    ix = 0; resetStep(); touch(now);
    if (appState) advanceFrom(appState, 'person');
    if (ix >= steps.length) return finish();
    return enter(prefix, now);
  }

  // Move past each step, in order, whose goal is now met.
  function advanceFrom(state, actor) {
    const from = ix;
    while (ix < steps.length && holds(steps[ix].doneWhen, state)) {
      const who = pending && pending.type === 'acting' && pending.ix === ix ? 'agent' : actor;
      if (!doneBy.has(ix)) doneBy.set(ix, who);
      ix++;
      if (who !== 'agent') pending = null;
    }
    if (ix !== from) {
      lastActor = doneBy.get(ix - 1) || 'person';
      resetStep();
    }
    return ix - from;
  }

  function finish() {
    phase = 'done';
    pending = null;
    const learned = (k) => { const s = steps[k]; return s.learned && (!s.learnedWhen || holds(s.learnedWhen, appState || {})); };
    const byPerson = [], byAgent = [];
    steps.forEach((s, k) => { if (!learned(k)) return; (doneBy.get(k) === 'agent' ? byAgent : byPerson).push(s.learned); });
    return turn(voice.close(lesson, { assisted, byAgent, byPerson }), null);
  }

  function hint(now) {
    const s = current();
    assisted = true;
    touch(now);
    const say = voice.hint(s, hintLevel);
    hintLevel = Math.min(hintLevel + 1, 2);
    return turn(say, show(Math.max(hintLevel, 1), 'hint'));
  }

  function watch(state) {
    const lines = [];
    for (const w of lesson.watch || []) {
      const on = holds(w.when, state);
      if (on && !watched.has(w.id)) { watched.add(w.id); lines.push(typeof w.say === 'function' ? w.say(state) : w.say); }
      if (!on) watched.delete(w.id);
    }
    return lines.join(' ');
  }

  // Resolve a reply to a pending choice question.
  function answer(utterance, intent, now) {
    const s = current();
    let value = null;
    if (intent === 'yes' && s.suggest) value = s.suggest(appState || {});
    if (value == null && s.parse) value = s.parse(utterance, appState || {});
    if (value == null) return turn(voice.askAgain(s, s.options ? s.options(appState || {}) : null), { target: targetOf(s), level: 0 });
    touch(now);
    return actNow(null, value);
  }

  return {
    get phase() { return phase; },
    get stepIndex() { return ix; },
    get step() { return current(); },
    get autonomy() { return policy.level; },
    get band() { return policy.band; },
    get familiarity() { return famLevel(); },
    get tone() { return voice.tone; },
    get awaiting() { return pending ? pending.type : null; },
    get shortMode() { return short(); },
    currentHighlight: () => hl(),
    /** The current step's target, even while it isn't shown (for sensing). */
    currentTarget() { const s = current(); return s && phase === 'active' && !pending && owner() === 'user' ? targetOf(s) : null; },
    get revealed() { return revealed; },
    get pointing() { return pointMode(); },
    /**
     * A sign of uncertainty from the host's sensing (see sensing.js):
     * 'empty-click' (a click on nothing clickable), 'other-control' (a click on
     * something other than the target), 'wander' (the pointer roams without
     * clicking), 'scroll-hunt' (scrolling back and forth).
     * Enough of them shows the target early; more after that gives a hint.
     */
    signal(kind, now) {
      if (phase !== 'active' || pending || owner() !== 'user') return null;
      const w = SIGNAL_WEIGHT[kind] || 0;
      if (!w) return null;
      unsure += w;
      const s = current();
      if (!revealed && unsure >= 2) { unsure = 0; touch(now); return turn(voice.showWhere(), show(0, `unsure:${kind}`)); }
      if (revealed && unsure >= 3 && nudges < MAX_NUDGES_PER_STEP) {
        unsure = 0; nudges += 1; touch(now);
        // Teacher responds by teaching; Helper (and Teacher 3) offer to do the step.
        if (policy.rescue !== 'teach' && s.kind !== 'private' && s.kind !== 'commit') { assisted = true; pending = { type: 'rescue', ix }; return turn(voice.rescueOffer(s), show(2, 'unsure')); }
        return hint(now);
      }
      return null;
    },
    activity(now) { touch(now); },

    setTone(next) { voice.setTone(next); return turn(null); },

    setFamiliarity(f) { fam = clamp(f, 0, 2); return turn(null); },

    /** Turn the autonomy dial. Re-describes the current step under the new policy. */
    setAutonomy(level, now) {
      policy = policyFor(level);
      voice.setBand(policy.band);
      if (phase !== 'active') return turn(null);
      // Mid-action: let it finish; the next step follows the new setting.
      if (pending && pending.type === 'acting') return turn(join(voice.autonomyChanged(policy.band, policy.level), 'I\'ll finish this step first.'));
      const note = voice.autonomyChanged(policy.band, policy.level);
      pending = null;
      return enter(note, now);
    },

    /** Something the person said up front, before the lesson ("a 10 inch cake"). */
    prefillFrom(utterance) {
      for (const s of steps) {
        if (s.kind === 'choose' && s.prefill && s.parse) {
          const v = s.parse(utterance, appState || {}, { upfront: true });
          if (v != null) prefill[s.id] = v;
        }
      }
    },

    start(now, utterance) {
      touch(now);
      if (utterance) this.prefillFrom(utterance);
      if (phase === 'active') return enter(null, now);
      if (timesCompleted > 0 && fam == null) { phase = 'choosing'; return turn(voice.familiarOffer(lesson), null); }
      return begin(now, voice.intro(lesson));
    },

    /** The app changed. `byAgent` is true while the host is carrying out an `act`. */
    observe(state, now) {
      const prev = appState;
      appState = state;
      touch(now);
      if (phase !== 'active') return null;
      const warn = watch(state);
      const wasActing = pending && pending.type === 'acting';
      const moved = advanceFrom(state, 'person');
      if (moved > 0) {
        if (ix >= steps.length) { const f = finish(); return warn ? { ...f, say: join(warn, f.say) } : f; }
        const praise = lastActor === 'person' && !wasActing ? voice.praise() : '';
        return enter(join(warn, praise), now);
      }
      if (wasActing) return warn ? turn(warn) : null; // the agent is mid-action; wait for it
      const s = current();
      if (s.view && !viewOk(s, state)) {
        if (!offTrack) { offTrack = true; return turn(join(warn, voice.offTrack(s))); }
        return warn ? turn(warn) : null;
      }
      if (offTrack) {
        offTrack = false;
        return turn(join(warn, voice.step(s, { withWhy: false, short: true })));
      }
      if (warn) return turn(warn);
      if (prev && prev.view !== state.view) return turn(null);
      return null;
    },

    /** The agent's action needed no change (e.g. "no message"): count the step as done. */
    stepSkipped(now) {
      if (!pending || pending.type !== 'acting') return null;
      doneBy.set(ix, 'agent');
      ix++;
      lastActor = 'agent';
      resetStep();
      if (ix >= steps.length) return finish();
      return enter(null, now);
    },

    /** The host could not carry out an `act`. Hand the step to the person. */
    actFailed(now) {
      if (!pending || pending.type !== 'acting') return null;
      taken.add(ix);
      pending = null;
      touch(now);
      return turn(voice.actFailed(current()), show(1, 'agent-failed'));
    },

    hear(utterance, now) {
      touch(now);
      const intent = parseUtterance(utterance);

      if (phase === 'idle') {
        if (intent === 'no') return turn(`Okay. I'm here whenever you'd like to start.`, null);
        if (intent === 'menu') return turn(`I can help with ${lesson.title.replace(/^How to /i, '').toLowerCase()}. Say "let's start" when you're ready.`, null);
        return this.start(now, utterance);
      }
      if (phase === 'choosing') {
        if (intent === 'shorter' || intent === 'done') fam = 2;
        else if (intent === 'longer' || intent === 'yes') fam = 0;
        else if (intent === 'no' || intent === 'stop') { phase = 'ended'; return turn(voice.ended(), null); }
        else return turn(voice.familiarOffer(lesson), null);
        return begin(now, fam === 2 ? 'Short reminders it is.' : 'Okay, the full walkthrough.');
      }
      if (phase === 'done' || phase === 'ended') {
        if (intent === 'yes' || /\b(again|restart|start over)\b/i.test(utterance)) { doneBy.clear(); taken.clear(); assisted = false; lastActor = 'person'; return begin(now, voice.intro(lesson)); }
        return turn(phase === 'done' ? `You've finished this task. Say "start over" to do it again.` : voice.ended(), null);
      }

      // phase === 'active'
      const s = current();

      if (pending && pending.type === 'acting') {
        if (intent === 'stop') { pending = null; phase = 'ended'; return turn(voice.ended(), null); }
        return turn(`One moment, I'm finishing this step.`);
      }

      if (pending && (pending.type === 'offer' || pending.type === 'rescue')) {
        if (intent === 'yes' || intent === 'act') { if (pending.type === 'rescue') assisted = true; return actNow(null, undefined, { takeover: pending.type === 'rescue' }); }
        if (intent === 'no' || intent === 'mine' || intent === 'done') { pending = null; taken.add(ix); return turn(voice.userTakes(s)); }
      }

      if (pending && pending.type === 'ask') {
        if (intent === 'mine') { pending = null; taken.add(ix); return turn(voice.userTakes(s), show(0, 'asked')); }
        if (intent === 'why') return turn(voice.why(s));
        if (intent === 'stop') { pending = null; phase = 'ended'; return turn(voice.ended(), null); }
        if (intent !== 'repeat' && intent !== 'menu') return answer(utterance, intent, now);
      }

      switch (intent) {
        case 'act': {
          if (s.kind === 'private' || s.kind === 'commit') return turn(voice.declinePrivate(s), show(1, 'asked'));
          if (!policy.honorsAct) return turn(voice.declineToAct(s), show(Math.max(hintLevel, 1), 'asked'));
          taken.delete(ix);
          if (s.kind === 'choose') { pending = { type: 'ask', ix }; return turn(typeof s.ask === 'function' ? s.ask(appState || {}) : s.ask, { target: targetOf(s), level: 0 }); }
          return actNow(null, undefined, { takeover: true });
        }
        case 'mine': taken.add(ix); return turn(voice.userTakes(s));
        case 'why': return turn(voice.why(s));
        case 'hint': {
          const own = s.kind !== 'private' && s.kind !== 'commit';
          if (own && policy.rescue === 'take') { assisted = true; if (s.kind === 'choose') { pending = { type: 'ask', ix }; return turn(join('Sure, I can do that.', typeof s.ask === 'function' ? s.ask(appState || {}) : s.ask), { target: targetOf(s), level: 0 }); } return actNow(null, undefined, { takeover: true }); }
          if (own && policy.rescue === 'offer' && hintLevel >= 1) { pending = { type: 'rescue', ix }; return turn(voice.rescueOffer(s), show(2, 'stuck')); }
          return hint(now);
        }
        case 'repeat': return pending && pending.type === 'ask' ? turn(typeof s.ask === 'function' ? s.ask(appState || {}) : s.ask) : enter(null, now);
        case 'menu': return turn(voice.menu(policy.band));
        case 'stop': phase = 'ended'; pending = null; return turn(voice.ended(), null);
        case 'shorter': fam = 2; return turn(`Okay, I'll keep it short. ${voice.step(s, { withWhy: false, short: true })}`);
        case 'longer': fam = 0; return turn(voice.step(s, { withWhy: true, short: false }));
        case 'done': {
          if (appState && holds(s.doneWhen, appState)) return this.observe(appState, now);
          hintLevel = Math.max(hintLevel, 1);
          return turn(voice.notYet(s), show(1, 'asked'));
        }
        default:
          return turn(`I'm here to help with this. ${voice.step(s, { withWhy: false, short: true })} ${voice.menu(policy.band)}`);
      }
    },

    tick(now) {
      if (phase !== 'active' || typeof now !== 'number') return null;
      if (pending && pending.type === 'acting') return null;
      // Wait time over: point at the target quietly.
      if (!revealed && !pending && pointMode() === 'wait' && now - stepStart >= waitMs()) { revealed = true; revealNote = 'wait-time'; return turn(null); }
      const wait = stuckAfterMs * (policy.extraGuidance ? 0.7 : 1) * (famLevel() === 2 ? 1.6 : 1);
      if (now - lastActivity < wait) return null;
      if (nudges >= MAX_NUDGES_PER_STEP) return null;
      nudges += 1;
      lastActivity = now;
      const s = current();
      if (pending && (pending.type === 'ask' || pending.type === 'offer' || pending.type === 'rescue')) {
        return nudges === 1 ? turn(voice.waitingForAnswer(s)) : null;
      }
      const canTakeOver = policy.rescue !== 'teach' && s.kind !== 'private' && s.kind !== 'commit';
      if (nudges === 1) { hintLevel = Math.max(hintLevel, 1); return turn(voice.stuckCheck(s, { canTakeOver }), show(1, 'stuck')); }
      return hint(now);
    },
  };
}

/** Back-compat: the Teacher is the agent with the dial at 2. */
export function createTeacher(opts = {}) { return createAgent({ autonomy: 2, tone: 'warm', ...opts }); }
