// voice.js — speech in and out with the browser's Web Speech API.
//
// Both are optional and feature-detected: typing always works, and every
// spoken line is also shown as text. bestVoice() and forSpeech() follow the
// same logic as the AI for Accessibility Toolkit's Controller
// (controller/web/ui.js, Apache-2.0).

const W = typeof window !== 'undefined' ? window : {};
const SR = W.SpeechRecognition || W.webkitSpeechRecognition;
const TTS = 'speechSynthesis' in W;

export const canListen = !!SR;
export const canSpeak = TTS;

/** Prefer a high-quality local voice, then a network voice, then the default. */
export function bestVoice(voices, lang = 'en') {
  const all = voices || [];
  const inLang = all.filter((v) => v && v.lang && v.lang.toLowerCase().startsWith(lang));
  const pool = inLang.length ? inLang : all;
  const pick = (rx) => pool.find((v) => v && rx.test(v.name || ''));
  return pick(/\((Premium|Enhanced)\)/i) || pick(/^Google /) || pool.find((v) => v && v.default) || pool[0] || null;
}

/** Strip markdown-ish characters a speech engine would read out literally. */
export function forSpeech(text) {
  return String(text == null ? '' : text)
    .replace(/[`*~#|_]/g, '')
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

export function createSpeaker({ rate = 0.95 } = {}) {
  let voice = null;
  let enabled = true;
  const listeners = new Set();
  const notify = (on) => listeners.forEach((fn) => fn(on));

  function load() {
    if (!TTS) return;
    voice = bestVoice(W.speechSynthesis.getVoices(), 'en');
  }
  if (TTS) { load(); W.speechSynthesis.addEventListener && W.speechSynthesis.addEventListener('voiceschanged', load); }

  return {
    get enabled() { return enabled && TTS; },
    set enabled(v) { enabled = !!v; if (!enabled) this.cancel(); },
    get rate() { return rate; },
    set rate(v) { rate = Math.min(1.4, Math.max(0.6, Number(v) || 1)); },
    onSpeaking(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    speak(text) {
      if (!TTS || !enabled || !text) return;
      try {
        W.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(forSpeech(text));
        if (voice) u.voice = voice;
        u.rate = rate;
        u.onstart = () => notify(true);
        u.onend = u.onerror = () => notify(false);
        W.speechSynthesis.speak(u);
      } catch { notify(false); }
    },
    cancel() { if (TTS) { try { W.speechSynthesis.cancel(); } catch {} } notify(false); },
  };
}

/**
 * Push-to-talk recognition: one utterance per press. Predictable, and it never
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
      rec.lang = 'en-US'; rec.interimResults = true; rec.maxAlternatives = 1;
      let finalText = '';
      rec.onresult = (e) => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) finalText += r[0].transcript; else interim += r[0].transcript;
        }
        onInterim((finalText + ' ' + interim).trim());
      };
      rec.onerror = (e) => { onState('error', e && e.error); };
      rec.onend = () => { listening = false; onState('idle'); if (finalText.trim()) onFinal(finalText.trim()); };
      try { rec.start(); listening = true; onState('listening'); } catch { listening = false; onState('error', 'start-failed'); }
    },
    stop() { try { rec && rec.stop(); } catch {} },
  };
}
