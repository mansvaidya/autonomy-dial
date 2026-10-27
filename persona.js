// persona.js — how the agent SOUNDS. Kept apart from what it is allowed to do.
//
// Two separate settings shape the wording:
//   • tone (DG2: calibrate voice independently of control): warm, neutral,
//     minimal, or 'auto', which follows the paper's personas: Teacher and Helper
//     warm, Autopilot neutral and transactional.
//   • band (from the autonomy dial): teacher, helper or autopilot. The band
//     changes WHO is framed as acting ("you'll click" vs "I'm adding…").
//
// The amount of guidance (steps, hints, highlights) never depends on tone.

export const TONES = ['auto', 'warm', 'neutral', 'minimal'];
const PRAISE = ['Wonderful.', 'Nice work.', "That's it.", 'Great.', 'Perfect.'];

export function createVoice(tone = 'auto') {
  let setting = TONES.includes(tone) ? tone : 'auto';
  let band = 'teacher';
  let praiseIx = 0;

  // The tone actually used right now.
  const t = () => (setting !== 'auto' ? setting : band === 'autopilot' ? 'minimal' : 'warm');
  const warm = () => t() === 'warm';

  return {
    get tone() { return setting; },
    get effectiveTone() { return t(); },
    setTone(next) { if (TONES.includes(next)) setting = next; return setting; },
    setBand(b) { band = b; },
    explainsByDefault: () => t() !== 'minimal',

    intro(lesson) {
      const goal = lesson.goal || lesson.title.replace(/^How to /i, '').replace(/\.$/, '');
      if (band === 'autopilot') {
        if (t() === 'minimal') return `On it. I'll narrate as I go and ask when I need a choice. You'll enter private details and make the final decision.`;
        return `I'll ${goal} for you and tell you what I'm doing as I go. I'll check with you on choices, and you'll type any private details and make the final decision yourself.`;
      }
      if (band === 'helper') {
        if (t() === 'minimal') return `You lead. Say "help" on any step and I'll do that step.`;
        if (t() === 'neutral') return `You'll lead. If you get stuck on a step, say "help" and I'll do that step, then hand it back.`;
        return `Happy to help you ${goal}. Why don't you try it yourself? I'll be right here, and if you get stuck, just say so and I'll take care of that step.`;
      }
      if (t() === 'minimal') return `${lesson.steps.length} steps. You do the clicking; I'll point to each step.`;
      if (t() === 'neutral') return `I'll guide you through it in ${lesson.steps.length} steps. You do the clicking and typing; I'll highlight where to look and explain each step.`;
      return `Of course. I'll help you learn how to ${goal} yourself. I'll guide you through each step, but you'll be the one clicking the buttons. Take your time.`;
    },

    familiarOffer(lesson) {
      const task = lesson.title.replace(/^How to /i, '');
      if (t() === 'minimal') return `You've done this before. Full walkthrough or short reminders?`;
      return `You've done this before: ${task}. Would you like the full walkthrough again, or just short reminders this time?`;
    },

    praise() {
      if (band === 'autopilot') return '';
      if (!warm()) return t() === 'neutral' ? 'Done.' : '';
      return PRAISE[praiseIx++ % PRAISE.length];
    },

    // One step for the PERSON to do.
    step(step, { withWhy, short, yourTurn }) {
      const say = short && step.short ? step.short : step.instruction;
      const why = withWhy && step.why ? ` ${step.why}` : '';
      const lead = yourTurn ? (t() === 'minimal' ? 'Your turn: ' : 'Your turn again. ') : '';
      return `${lead}${say}${why}`.trim();
    },

    // A step the person always does, even at high autonomy (DG1 hand-back).
    handBack(step, { short }) {
      const say = short && step.short ? step.short : step.instruction;
      if (step.kind === 'private') {
        return t() === 'minimal'
          ? `Your turn: ${lowerFirst(step.short || say)} I don't type private details.`
          : `This part is yours. ${say} I don't type private details, and I can't see what you type.`;
      }
      return t() === 'minimal'
        ? `Ready for your decision: ${lowerFirst(step.short || say)}`
        : `Everything's ready. This decision is yours. ${say}`;
    },

    privacyNote() {
      return t() === 'minimal' ? '(Private: you type it; I don\'t read it.)' : 'This is private information, so you type it yourself. I can\'t see what you type, and nothing is saved.';
    },

    // The agent is about to act.
    narrate(step, value, { takeover } = {}) {
      const line = typeof step.narrate === 'function' ? step.narrate(value) : (step.narrate || `Doing this step: ${lowerFirst(step.short || step.instruction)}`);
      if (takeover) return t() === 'minimal' ? `Taking this step. ${line}` : `Let me do that one for you. ${line}`;
      return line;
    },

    offer(step) {
      if (t() === 'minimal') return `${step.short || step.instruction} Want me to do it?`;
      return `Next: ${lowerFirst(step.short || step.instruction)} Would you like me to do this one, or would you like to try?`;
    },

    rescueOffer(step) {
      return t() === 'warm'
        ? `This one's tricky to find. Would you like me to do just this step for you? Say yes, or "I'll try" to keep going yourself.`
        : `Want me to do this step? Say yes or "I'll try".`;
    },

    returnControl() { return t() === 'minimal' ? '' : (warm() ? 'Done. ' : 'Done. '); },

    actFailed(step) {
      return `I couldn't do that one on this page. Could you? ${step.short || step.instruction}`;
    },

    askAgain(step, options) {
      return options && options.length ? `Sorry, I didn't catch that. You can say ${joinList(options.map((o) => `"${o}"`), 'or')}.` : `Sorry, I didn't catch that. ${step.ask ? '' : step.instruction}`;
    },

    autonomyChanged(band, level) {
      if (band === 'teacher') return t() === 'minimal' ? `Teacher mode (${level}). You click; I guide.` : `Okay, I'll guide you and you'll do the clicking.`;
      if (band === 'helper') return t() === 'minimal' ? `Helper mode (${level}). You lead; I step in when asked.` : `Okay, you lead, and I'll step in on any step you want help with.`;
      return t() === 'minimal' ? `Autopilot mode (${level}). I'll do the steps; you keep private details and the final decision.` : `Okay, I'll take it from here. You'll still type private details and make the final decision.`;
    },

    why(step) {
      if (!step.why) return `That step is just how this site is laid out.`;
      return warm() ? `Good question. ${step.why}` : step.why;
    },

    hint(step, level) {
      const hints = step.hints || [];
      const h = hints[Math.min(level, hints.length - 1)] || step.instruction;
      if (warm()) return level === 0 ? `No rush. ${h}` : `That's a tricky one to spot. ${h} I've made the highlight brighter.`;
      return level === 0 ? h : `${h} The highlight is now brighter.`;
    },

    stuckCheck(step, { canTakeOver }) {
      const help = canTakeOver ? (t() === 'minimal' ? ' Say "help" and I\'ll do it.' : ' If you\'d like, say "help" and I\'ll do this step.') : '';
      if (t() === 'minimal') return `Still on this step: ${step.short || step.instruction}${help}`;
      if (t() === 'neutral') return `Still on this step. ${step.hints && step.hints[0] ? step.hints[0] : step.instruction}${help}`;
      return `Take your time. If it helps, ${lowerFirst(step.hints && step.hints[0] ? step.hints[0] : step.instruction)}${help}`;
    },

    waitingForAnswer(step) {
      return t() === 'minimal' ? `Waiting for your answer: ${step.askShort || 'which one?'}` : `Whenever you're ready: ${step.askShort || 'which would you like?'}`;
    },

    notYet(step) {
      return warm() ? `I don't see that yet, and that's okay. ${step.short || step.instruction}` : `Not done yet. ${step.short || step.instruction}`;
    },

    offTrack(step) {
      const back = step.getBack || 'Go back to the page you were on.';
      return warm() ? `Looks like we've moved to a different page, no problem. ${back}` : back;
    },

    declineToAct(step) {
      const where = step ? ` It's highlighted on the screen: ${lowerFirst(step.short || step.instruction)}` : '';
      return warm()
        ? `In this mode I'll keep this in your hands, so I won't click for you. You can do it.${where} If you'd like me to do steps, turn the dial toward Helper.`
        : `I don't click or type in Teacher mode.${where}`;
    },

    declinePrivate(step) {
      return step.kind === 'private'
        ? `I don't type private details, even when asked. ${step.short || step.instruction} I can't see what you type.`
        : `This last click stays with you, so you're always the one who decides. ${step.short || step.instruction}`;
    },

    userTakes(step) { return `Sure, go ahead. ${step.short || step.instruction}`; },

    menu(band) {
      const more = band === 'teacher' ? '' : ' You can also say "do it for me" or "I\'ll do it".';
      return `You can ask "why", "where is it", "I'm stuck", "repeat that", or say "done" when you've finished a step. You can also say "shorter" or "more detail".${more}`;
    },

    close(lesson, { assisted, byAgent, byPerson }) {
      const list = joinList(byPerson);
      if (band === 'autopilot' || (!byPerson.length && byAgent.length)) {
        const yours = byPerson.length ? ` You ${list}.` : '';
        return t() === 'minimal' ? `Done.${yours}` : `All done.${yours} The rest I handled, and I've told you each thing I did along the way.`;
      }
      if (t() === 'minimal') return `Done. You ${list}.`;
      if (t() === 'neutral') return `That's the whole task. You ${list}. Next time you'll know where each of these is.`;
      const help = assisted ? ' A couple of steps took some looking, which is normal the first time.' : '';
      const agentPart = byAgent.length ? ` I did ${byAgent.length === 1 ? 'one step' : `${byAgent.length} steps`} along the way.` : ', all by yourself.';
      return `You did it. You ${list}${byAgent.length ? '.' : ''}${agentPart}${help} Next time you'll know where everything is, and I'm here if you want a refresher.`;
    },

    ended() { return warm() ? `Okay, we'll stop here. You can pick it up again any time.` : `Stopped.`; },
  };
}

function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
function lowerFirst(s) { return s ? s[0].toLowerCase() + s.slice(1) : s; }
export function joinList(items, word = 'and') {
  if (items.length <= 1) return items.join('');
  if (items.length === 2) return `${items[0]} ${word} ${items[1]}`;
  return items.slice(0, -1).join(', ') + `, ${word} ` + items[items.length - 1];
}
