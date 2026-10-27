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
  const live = new Set(); // keep utterances alive until they finish
  const listeners = new Set();
  const notify = () => { const on = live.size > 0; listeners.forEach((fn) => fn(on)); };

  const voice = () => {
    const v = bestVoice(W.speechSynthesis.getVoices(), 'en');
    voiceName = v ? v.name : null;
    return v;
  };
  if (TTS) { voice(); W.speechSynthesis.addEventListener && W.speechSynthesis.addEventListener('voiceschanged', voice); }

  function say(pieces) {
    const v = voice();
    for (const piece of pieces) {
      const u = new SpeechSynthesisUtterance(piece);
      if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'en-US';
      u.rate = rate;
      live.add(u);
      u.onstart = notify;
      u.onend = u.onerror = () => { live.delete(u); notify(); };
      W.speechSynthesis.speak(u);
    }
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
    /** Speak a line. With {queue:true} it waits for earlier lines (agent
     *  narration in a row); otherwise it interrupts them. */
    speak(text, { queue = false } = {}) {
      if (!TTS || !enabled || !text) return;
      try {
        if (!queue && (W.speechSynthesis.speaking || W.speechSynthesis.pending)) this.cancel();
        const pieces = chunks(text);
        const wait = Math.max(0, 120 - (Date.now() - lastCancel));
        if (wait) setTimeout(() => say(pieces), wait); else say(pieces);
      } catch { live.clear(); notify(); }
    },
    cancel() {
      if (TTS) { try { W.speechSynthesis.cancel(); } catch {} }
      lastCancel = Date.now();
      live.clear();
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
 * Tap-to-talk recognition: one request per tap. Predictable, and it never
 * listens in the background without the person knowing.
 */
export function createListener({ onInterim = () => {}, onFinal = () => {}, onState = () => {} } = {}) {
  if (!SR) return null;
  let rec = null;
  let listening = false;
  return {
    get listening() { return listening; },
    start() {
      if (listening) return;
      rec = new SR();
      rec.lang = 'en-US';
      rec.interimResults = true;
      rec.continuous = false;
      rec.maxAlternatives = 1;
      let finalText = '';
      let interimText = '';
      let failed = null;
      rec.onresult = (e) => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) finalText += r[0].transcript; else interim += r[0].transcript;
        }
        interimText = interim;
        onInterim((finalText + ' ' + interim).trim());
      };
      // Watchdog: some browsers accept start() and then never answer.
      let gotAudio = false, ended = false;
      const clear = () => { clearTimeout(noStartTimer); clearTimeout(maxTimer); clearTimeout(killTimer); };
      const giveUp = (why) => { if (ended) return; ended = true; clear(); listening = false; try { rec.abort(); } catch {} onState('error', why); };
      const noStartTimer = setTimeout(() => { if (!gotAudio) giveUp('no-response'); }, 6000);
      const maxTimer = setTimeout(() => { try { rec.stop(); } catch {} }, 20000);
      let killTimer = 0;
      rec.onaudiostart = () => { gotAudio = true; };
      rec.onerror = (e) => { failed = (e && e.error) || 'unknown'; };
      rec.onend = () => {
        if (ended) return;
        ended = true;
        clear();
        listening = false;
        // If the person tapped to stop before Chrome finalised, use what it heard so far.
        const heard = (finalText || interimText).trim();
        if (heard) { onState('idle'); onFinal(heard); return; }
        if (failed && failed !== 'aborted') onState('error', failed);
        else onState('error', 'no-speech');
      };
      this._giveUp = giveUp;
      this._arm = () => { killTimer = setTimeout(() => giveUp(gotAudio ? 'no-speech' : 'no-response'), 2500); };
      try { rec.start(); listening = true; onState('listening'); } catch { clear(); listening = false; onState('error', 'start-failed'); }
    },
    stop() {
      try { rec && rec.stop(); } catch {}
      if (this._arm) this._arm(); // if the browser never ends the session, end it ourselves
    },
  };
}
