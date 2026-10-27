// persona.js — how the Teacher SOUNDS, kept separate from what it is allowed
// to DO (it is never allowed to act on the page; see guide-receiver.js).
//
// Design Guideline 2 of "What Moves the Dial?": calibrate voice and presence
// independently of control. Participants who disliked the Teacher persona
// mostly objected to its tone ("do you think I'm a totally incompetent
// 75-year-old man?"), not to the amount of guidance. So the amount of guidance
// stays the same at every tone; only the wording changes.
//
//   warm    — encouraging, explains why, reflective close (the paper's Teacher)
//   neutral — explains why, no praise or affect
//   minimal — instructions only; reasons only when asked

export const TONES = ['warm', 'neutral', 'minimal'];

const PRAISE = ['Wonderful.', 'Nice work.', "That's it.", 'Great.', 'Perfect.'];

export function createVoice(tone = 'warm') {
  let t = TONES.includes(tone) ? tone : 'warm';
  let praiseIx = 0;

  const warm = () => t === 'warm';
  const explains = () => t !== 'minimal';

  return {
    get tone() { return t; },
    setTone(next) { if (TONES.includes(next)) t = next; return t; },
    explainsByDefault: explains,

    intro(lesson) {
      if (t === 'minimal') return `${lesson.title}. ${lesson.steps.length} steps. You do the clicking; I'll point to each step.`;
      if (t === 'neutral') return `I'll guide you through ${lesson.title.toLowerCase()} in ${lesson.steps.length} steps. You do the clicking and typing; I'll highlight where to look and explain each step.`;
      return `Of course. I'll help you learn ${lesson.title.toLowerCase()} yourself. I'll guide you through each step, but you'll be the one clicking the buttons. Take your time.`;
    },

    // Offered when the person has done this lesson before (DG1: guidance fades
    // with familiarity, but the person chooses, it isn't imposed).
    familiarOffer(lesson) {
      if (t === 'minimal') return `You've done this before. Full walkthrough or short reminders?`;
      return `You've done ${lesson.title.toLowerCase()} before. Would you like the full walkthrough again, or just short reminders this time?`;
    },

    praise() {
      if (!warm()) return t === 'neutral' ? 'Done.' : '';
      return PRAISE[praiseIx++ % PRAISE.length];
    },

    // One step's instruction, optionally with its reason.
    step(step, { withWhy, short }) {
      const say = short && step.short ? step.short : step.instruction;
      const why = withWhy && step.why ? ` ${step.why}` : '';
      const sens = step.sensitive ? ` ${sensitiveNote(t)}` : '';
      return `${say}${why}${sens}`.trim();
    },

    why(step) {
      if (!step.why) return `That step is just how this site is laid out.`;
      return t === 'warm' ? `Good question. ${step.why}` : step.why;
    },

    hint(step, level) {
      const hints = step.hints || [];
      const h = hints[Math.min(level, hints.length - 1)] || step.instruction;
      if (t === 'warm') return level === 0 ? `No rush. ${h}` : `That's a tricky one to spot. ${h} I've made the highlight brighter.`;
      return level === 0 ? h : `${h} The highlight is now brighter.`;
    },

    stuckCheck(step) {
      if (t === 'minimal') return `Still on this step: ${step.short || step.instruction}`;
      if (t === 'neutral') return `Still on this step. ${step.hints && step.hints[0] ? step.hints[0] : step.instruction}`;
      return `Take your time. If it helps, ${lowerFirst(step.hints && step.hints[0] ? step.hints[0] : step.instruction)}`;
    },

    notYet(step) {
      return t === 'warm'
        ? `I don't see that yet, and that's okay. ${step.short || step.instruction}`
        : `Not done yet. ${step.short || step.instruction}`;
    },

    offTrack(step) {
      const back = step.getBack || 'Go back to the page you were on.';
      return t === 'warm' ? `Looks like we've moved to a different page, no problem. ${back}` : back;
    },

    // The Teacher keeps the person in control. It declines to act and points
    // instead — every time, not just the first.
    declineToAct(step) {
      const where = step ? ` It's highlighted on the screen: ${lowerFirst(step.short || step.instruction)}` : '';
      return t === 'warm'
        ? `I'll keep this in your hands, so I won't click for you. You can do it.${where}`
        : `I don't click or type in this mode.${where}`;
    },

    menu() {
      return `You can ask "why", "where is it", "I'm stuck", "repeat that", or say "done" when you've finished a step. You can also say "shorter" or "more detail".`;
    },

    close(lesson, { assisted }) {
      const learned = lesson.recap || lesson.steps.map((s) => s.learned).filter(Boolean);
      const list = joinList(learned);
      if (t === 'minimal') return `Done. You ${list}.`;
      if (t === 'neutral') return `That's the whole task. You ${list}. Next time you'll know where each of these is.`;
      const help = assisted ? ' A couple of steps took some looking, which is normal the first time.' : '';
      return `You did it. You ${list}, all by yourself.${help} Next time you'll know where everything is, and I'm here if you want a refresher.`;
    },

    ended() { return t === 'warm' ? `Okay, we'll stop here. You can pick it up again any time.` : `Lesson ended.`; },
  };
}

function sensitiveNote(t) {
  return t === 'minimal'
    ? `(Private: you type it; I don't read it.)`
    : `This is private information, so you type it yourself. I can't see what you type, and nothing is saved.`;
}

function lowerFirst(s) { return s ? s[0].toLowerCase() + s.slice(1) : s; }
function joinList(items) {
  if (items.length <= 1) return items.join('');
  return items.slice(0, -1).join(', ') + ', and ' + items[items.length - 1];
}
