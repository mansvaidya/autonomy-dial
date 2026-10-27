// voice.js — speech in and out with the browser's Web Speech API.
//
// Both are optional and feature-detected: typing always works, and every
// spoken line is also shown as text. bestVoice() and forSpeech() follow the
// same idea as the AI for Accessibility Toolkit's Controller
// (controller/web/ui.js, Apache-2.0).
//
// Chrome quirks handled here:
//   • network ("Google …") voices stop after ~15 seconds, so long lines are
//     split into sentences and spoken one by one
//   • speak() straight after cancel() is sometimes dropped, so speaking waits a
//     moment after a cancel
//   • utterances can be garbage-collected mid-speech (onend never fires), so we
//     keep references until they finish
//   • the voice list loads late, so the voice is picked when speaking
//   • speech recognition fails quietly (no speech heard, mic blocked, offline),
//     so every failure is turned into a message the person can act on

const W = typeof window !== 'undefined' ? window : {};
const SR = W.SpeechRecognition || W.webkitSpeechRecognition;
const TTS = 'speechSynthesis' in W && typeof W.SpeechSynthesisUtterance !== 'undefined';

export const canListen = !!SR;
export const canSpeak = TTS;

/** Prefer a high-quality voice on this computer, then any local voice, then a network voice. */
export function bestVoice(voices, lang = 'en') {
  const all = voices || [];
  const inLang = all.filter((v) => v && v.lang && v.lang.toLowerCase().startsWith(lang));
  const pool = inLang.length ? inLang : all;
  const us = pool.filter((v) => /en[-_]US/i.test(v.lang));
  const pick = (list, test) => list.find((v) => v && test(v));
  return pick(pool, (v) => /\((Premium|Enhanced)\)/i.test(v.name))
    || pick(us, (v) => v.localService && /^(Samantha|Ava|Allison|Susan|Zoe|Evan|Nathan|Tom|Alex|Microsoft (Aria|Jenny|Guy))/i.test(v.name))
    || pick(us, (v) => v.localService && v.default)
    || pick(us, (v) => v.localService)
    || pick(pool, (v) => /^Google /.test(v.name))
    || pick(pool, (v) => v.default) || pool[0] || null;
}

/** Strip markdown-ish characters a speech engine would read out literally. */
export function forSpeech(text) {
  return String(text == null ? '' : text)
    .replace(/[`*~#|_]/g, '')
    .replace(/[“”]/g, '"')
    .replace(/–/g, ' to ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Split into sentence-sized pieces (Chrome cuts long network speech short). */
export function chunks(text, max = 160) {
  const parts = forSpeech(text).match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) || [];
  const out = [];
  for (let p of parts) {
    p = p.trim();
    while (p.length > max) {
      const cut = p.lastIndexOf(',', max) > 40 ? p.lastIndexOf(',', max) + 1 : p.lastIndexOf(' ', max);
      out.push(p.slice(0, cut > 0 ? cut : max).trim());
      p = p.slice(cut > 0 ? cut : max).trim();
    }
    if (p) out.push(p);
  }
  return out;
}

export function createSpeaker({ rate = 0.95 } = {}) {
  let enabled = true;
  let lastCancel = 0;
  let voiceName = null;
  const live = new Set();   // keep utterances alive until they finish
  const lines = new Set();  // lines not yet finished, so cancel can finish their captions
  const listeners = new Set();
  const notify = () => { const on = live.size > 0; listeners.forEach((fn) => fn(on)); };

  const voice = () => {
    const v = bestVoice(W.speechSynthesis.getVoices(), 'en');
    voiceName = v ? v.name : null;
    return v;
  };
  if (TTS) { voice(); W.speechSynthesis.addEventListener && W.speechSynthesis.addEventListener('voiceschanged', voice); }

  // Speak one line as sentence pieces, reporting progress through the whole
  // line (0..1) so captions can follow the voice. Word-boundary events drive
  // progress when the voice provides them; otherwise it's estimated from the
  // speaking rate.
  function say(line) {
    const v = voice();
    const total = line.pieces.reduce((n, p) => n + p.length, 0) || 1;
    let before = 0;
    line.pieces.forEach((piece, k) => {
      const offset = before;
      before += piece.length;
      const u = new SpeechSynthesisUtterance(piece);
      if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'en-US';
      u.rate = rate;
      live.add(u);
      let timer = 0, boundary = false;
      const progress = (charsInPiece) => line.onProgress(Math.min(1, (offset + charsInPiece) / total));
      u.onstart = () => {
        if (k === 0) line.start();
        notify();
        const cps = 14 * rate; // about 2.5 words a second
        const t0 = Date.now();
        timer = setInterval(() => { if (!boundary) progress(Math.min(piece.length, (Date.now() - t0) / 1000 * cps)); }, 120);
      };
      u.onboundary = (e) => { if (e.name === 'word' || e.name === undefined) { boundary = true; progress(e.charIndex + (e.charLength || 0)); } };
      u.onend = u.onerror = () => {
        clearInterval(timer);
        live.delete(u);
        progress(piece.length);
        if (k === line.pieces.length - 1) line.finish();
        notify();
      };
      W.speechSynthesis.speak(u);
    });
    // Chrome can leave the queue paused after a cancel; nudge it.
    if (W.speechSynthesis.paused) W.speechSynthesis.resume();
    notify();
  }

  return {
    get enabled() { return enabled && TTS; },
    set enabled(v) { enabled = !!v; if (!enabled) this.cancel(); },
    get rate() { return rate; },
    set rate(v) { rate = Math.min(1.4, Math.max(0.6, Number(v) || 1)); },
    get voiceName() { return voiceName; },
    onSpeaking(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    /**
     * Speak a line. With {queue:true} it waits for earlier lines (agent
     * narration in a row); otherwise it interrupts them.
     * Callbacks: onStart() when the voice begins this line, onProgress(0..1)
     * as it speaks, onEnd({cancelled}) when it finishes or is cut off. When
     * speech is off or unavailable, they fire straight away.
     */
    speak(text, { queue = false, onStart = () => {}, onProgress = () => {}, onEnd = () => {} } = {}) {
      let done = false, started = false;
      const line = {
        pieces: chunks(text),
        start() { if (!started) { started = true; onStart(); } },
        onProgress,
        finish(cancelled = false) { if (done) return; done = true; lines.delete(line); line.start(); onProgress(1); onEnd({ cancelled }); },
      };
      if (!TTS || !enabled || !text || !line.pieces.length) { line.finish(); return; }
      lines.add(line);
      try {
        if (!queue && (W.speechSynthesis.speaking || W.speechSynthesis.pending)) this.cancel();
        const wait = Math.max(0, 120 - (Date.now() - lastCancel));
        if (wait) setTimeout(() => (done ? null : say(line)), wait); else say(line);
        // If the voice never starts (no voices, blocked audio), show the words anyway.
        setTimeout(() => { if (!started && !done && !W.speechSynthesis.speaking) line.finish(true); }, 2500 + wait);
      } catch { line.finish(true); live.clear(); notify(); }
    },
    cancel() {
      if (TTS) { try { W.speechSynthesis.cancel(); } catch {} }
      lastCancel = Date.now();
      live.clear();
      for (const l of [...lines]) l.finish(true); // show the full text of anything cut off
      notify();
    },
  };
}

// What to tell the person when listening fails.
export const LISTEN_ERRORS = {
  'no-speech': 'I didn\'t hear anything. Tap the mic and start talking right away, or type instead.',
  'audio-capture': 'I couldn\'t find a microphone. Check that one is connected, or type instead.',
  'not-allowed': 'The microphone is blocked for this page. Click the icon at the left of the address bar, allow the microphone, and reload. Or type instead.',
  'service-not-allowed': 'This browser isn\'t letting the page use speech recognition. Try Google Chrome, or type instead.',
  network: 'Voice input needs an internet connection: Chrome sends what you say to Google to turn it into text. Check your connection, or type instead.',
  'language-not-supported': 'Voice input doesn\'t support English (US) in this browser. Please type instead.',
  'start-failed': 'Voice input couldn\'t start. Wait a second and tap the mic again.',
  'no-response': 'Voice input isn\'t responding in this browser. It works in Google Chrome or Microsoft Edge on a computer; in other browsers, or browsers built into apps, please type instead.',
};

/**
 * Hands-free voice input: switch it on once and it keeps listening, sending
 * each thing the person says, until it's switched off. While the agent is
 * speaking it pauses (so it doesn't hear itself) and then resumes.
 *
 *   const mic = createListener({ onInterim, onFinal, onState });
 *   mic.start()  → on      mic.stop() → off      mic.pause()/resume()
 *
 * onState('listening' | 'paused' | 'idle' | 'error', errorCode)
 */
export function createListener({ onInterim = () => {}, onFinal = () => {}, onState = () => {} } = {}) {
  if (!SR) return null;
  let on = false;          // the person's switch
  let paused = false;      // paused while the agent speaks
  let rec = null;
  let running = false;
  let heardAudio = false;
  let firstStart = true;
  let restartTimer = 0, watchdog = 0;
  let interimText = '';

  function session() {
    if (!on || paused || running) return;
    rec = new SR();
    rec.lang = 'en-US';
    rec.interimResults = true;
    rec.continuous = true;
    rec.maxAlternatives = 1;
    interimText = '';
    rec.onaudiostart = () => { heardAudio = true; clearTimeout(watchdog); };
    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) { const t = r[0].transcript.trim(); interimText = ''; if (t) onFinal(t); }
        else interim += r[0].transcript;
      }
      interimText = interim.trim();
      onInterim(interimText);
    };
    rec.onerror = (e) => {
      const err = (e && e.error) || 'unknown';
      if (err === 'no-speech' || err === 'aborted') return; // normal while hands-free
      if (['not-allowed', 'service-not-allowed', 'audio-capture', 'language-not-supported'].includes(err)) { switchOff(err); return; }
      if (err === 'network') { switchOff('network'); }
    };
    rec.onend = () => {
      running = false;
      // Chrome ends sessions after silence; anything half-heard is sent.
      if (interimText) { const t = interimText; interimText = ''; onInterim(''); onFinal(t); }
      if (on && !paused) { clearTimeout(restartTimer); restartTimer = setTimeout(session, 250); }
    };
    try {
      rec.start();
      running = true;
      onState(paused ? 'paused' : 'listening');
      // Some browsers accept start() and never answer.
      if (firstStart) { clearTimeout(watchdog); watchdog = setTimeout(() => { if (!heardAudio) switchOff('no-response'); }, 6000); }
      firstStart = false;
    } catch { running = false; restartTimer = setTimeout(session, 500); }
  }

  function halt() { clearTimeout(restartTimer); try { rec && rec.abort(); } catch {} running = false; }
  function switchOff(err) { on = false; halt(); clearTimeout(watchdog); onInterim(''); onState(err ? 'error' : 'idle', err); }

  return {
    get listening() { return on; },
    get paused() { return paused; },
    start() { if (on) return; on = true; paused = false; heardAudio = false; firstStart = true; session(); onState('listening'); },
    stop() { if (!on) return; switchOff(null); },
    /** Stop hearing for a moment (the agent is talking). */
    pause() { if (!on || paused) return; paused = true; halt(); onState('paused'); },
    resume() { if (!on || !paused) return; paused = false; session(); onState('listening'); },
  };
}
