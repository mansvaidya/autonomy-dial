// hands.js — the agent's ONLY way to act on a page, used when the autonomy
// dial gives it a step (Helper and Autopilot). Kept separate from guide.js,
// which can only point.
//
// The hand-back rule is enforced here, not just in the agent's wording:
//   • fields marked data-private / data-private-opt (address, phone, notes) and
//     password fields can never be typed into or clicked
//   • controls inside data-commit (Place order, Send list) can never be clicked
// So even a buggy lesson or a misheard request cannot make the agent type an
// address or place an order.
//
// Every action is slow enough to watch: the element scrolls into view, gets a
// turquoise ring (the paper's "agent controlling" convention), then is clicked
// or typed into one character at a time.

const FORBIDDEN = '[data-private], [data-private-opt], [data-commit], input[type="password"]';

export class HandBackError extends Error {}

export function createHands(doc = document, { speed = 1 } = {}) {
  const win = doc.defaultView;
  const wait = (ms) => new Promise((r) => win.setTimeout(r, ms * speed));
  const ring = doc.createElement('div');
  ring.className = 'hands-ring';
  ring.setAttribute('aria-hidden', 'true');
  ring.hidden = true;
  doc.body.append(ring);

  function visible(e) { return e && e.getClientRects().length > 0; }
  function pick(sel) {
    const all = [...doc.querySelectorAll(sel)].filter(visible);
    if (all.length <= 1) return all[0] || null;
    // Prefer one not covered by a popup, else the last (popups render last).
    const reachable = all.find((e) => {
      const r = e.getBoundingClientRect();
      const x = r.left + r.width / 2, y = r.top + Math.min(r.height / 2, 20);
      if (x < 0 || y < 0 || x > win.innerWidth || y > win.innerHeight) return false;
      const hit = doc.elementFromPoint(x, y);
      return !!hit && (e === hit || e.contains(hit) || !!hit.closest('.guide-box, .hands-ring'));
    });
    return reachable || all[all.length - 1];
  }
  function guard(el) {
    if (el.matches(FORBIDDEN) || el.closest(FORBIDDEN)) throw new HandBackError('This control is reserved for the person.');
  }
  async function show(el) {
    el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
    await wait(380);
    const r = el.getBoundingClientRect();
    Object.assign(ring.style, { top: `${r.top - 5}px`, left: `${r.left - 5}px`, width: `${r.width + 10}px`, height: `${r.height + 10}px` });
    ring.hidden = false;
    await wait(420);
  }

  return {
    /** Click the first reachable element matching `sel`. Resolves false if none. */
    async click(sel) {
      const el = pick(sel);
      if (!el) return false;
      guard(el);
      await show(el);
      el.click();
      await wait(250);
      ring.hidden = true;
      return true;
    },
    /** Type `text` into an input, one character at a time. */
    async type(sel, text, { submit = false } = {}) {
      const el = pick(sel);
      if (!el) return false;
      guard(el);
      await show(el);
      el.focus();
      el.value = '';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      for (const ch of String(text)) {
        el.value += ch;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        await wait(45);
      }
      el.dispatchEvent(new Event('change', { bubbles: true }));
      await wait(200);
      if (submit && el.form) el.form.requestSubmit();
      await wait(200);
      ring.hidden = true;
      return true;
    },
    /** Set a <select> or number input to a value. */
    async set(sel, value) {
      const el = pick(sel);
      if (!el) return false;
      guard(el);
      await show(el);
      el.focus();
      el.value = String(value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      await wait(250);
      ring.hidden = true;
      return true;
    },
    async pause(ms) { await wait(ms); },
    exists: (sel) => !!pick(sel),
    clear() { ring.hidden = true; },
    destroy() { ring.remove(); },
  };
}
