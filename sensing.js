// sensing.js — reads signs of uncertainty from how the person uses the page,
// so the agent can give wait time and respond when someone seems unsure.
//
// Signals (only from real input; the agent's own hands are ignored):
//   empty-click    a click on nothing clickable (searching for the right spot)
//   other-control  a click on a control that isn't the current step's target
//   wander         the pointer roams a long way for several seconds without a click
//   scroll-hunt    scrolling back and forth, as if looking for something
//
// It never reads what the person types. Positions are not stored; the session
// log only records which kind of signal happened.

const CLICKABLE = 'button, a, input, select, textarea, label, summary, [role="button"], [role="link"], [role="radio"], [role="checkbox"], [data-act]';

export function createSensor(root, { getTarget, onSignal }) {
  const doc = root.ownerDocument;
  let path = [];          // recent pointer positions: [time, x, y]
  let lastClick = 0;
  let lastWander = 0;
  let scrollDir = 0;
  let reversals = [];

  function inTarget(el) {
    const sel = getTarget();
    if (!sel) return null; // no step to compare against
    try { return [...doc.querySelectorAll(sel)].some((t) => t.contains(el)); } catch { return null; }
  }

  function onDown(e) {
    if (!e.isTrusted) return;
    lastClick = Date.now();
    path = [];
    const hit = inTarget(e.target);
    if (hit === null || hit) return;
    const control = e.target.closest(CLICKABLE);
    // Typing into a field, or clicking the panel's own inputs, isn't hunting.
    if (control && control.matches('input, textarea, select')) return;
    onSignal(control ? 'other-control' : 'empty-click');
  }

  function onMove(e) {
    if (!e.isTrusted) return;
    const now = Date.now();
    path.push([now, e.clientX, e.clientY]);
    while (path.length && now - path[0][0] > 4000) path.shift();
    if (now - lastClick < 4000 || now - lastWander < 6000 || path.length < 10) return;
    let dist = 0;
    for (let i = 1; i < path.length; i++) dist += Math.hypot(path[i][1] - path[i - 1][1], path[i][2] - path[i - 1][2]);
    if (dist > 2200) { lastWander = now; path = []; onSignal('wander'); }
  }

  function onWheel(e) {
    if (!e.isTrusted) return;
    const dir = Math.sign(e.deltaY);
    if (!dir) return;
    const now = Date.now();
    if (scrollDir && dir !== scrollDir) {
      reversals.push(now);
      reversals = reversals.filter((t) => now - t < 8000);
      if (reversals.length >= 3) { reversals = []; onSignal('scroll-hunt'); }
    }
    scrollDir = dir;
  }

  root.addEventListener('pointerdown', onDown, true);
  root.addEventListener('pointermove', onMove, { passive: true });
  root.addEventListener('wheel', onWheel, { passive: true, capture: true });
  return {
    reset() { path = []; reversals = []; scrollDir = 0; },
    destroy() {
      root.removeEventListener('pointerdown', onDown, true);
      root.removeEventListener('pointermove', onMove);
      root.removeEventListener('wheel', onWheel, true);
    },
  };
}
