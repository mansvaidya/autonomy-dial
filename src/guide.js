// guide.js — the Teacher's only way of touching the page: pointing.
//
// This is the Teacher's counterpart to the toolkit Controller's ControlPort,
// with the acting half removed ON PURPOSE. A ControlPort has
// performAction('activate', …), which clicks for the user. The guide has no
// click, type, submit, scroll or navigate method at all, so the Teacher cannot
// take over the interface even by mistake: the boundary is structural, not a
// prompt instruction.
//
//   highlight({ target, level }) → { found, visible, direction }
//   clear()
//
// level 0 = calm outline, 1 = brighter, 2 = brightest with a gentle pulse.
// The overlay ignores pointer events, so it never blocks the person's click.
// If the target is off screen, an edge marker shows which way to scroll; the
// Teacher tells the person to scroll rather than scrolling for them.

export function createGuide(doc = document) {
  const win = doc.defaultView;
  const box = doc.createElement('div');
  box.className = 'guide-box';
  box.setAttribute('aria-hidden', 'true');
  const edge = doc.createElement('div');
  edge.className = 'guide-edge';
  edge.setAttribute('aria-hidden', 'true');
  doc.body.append(box, edge);

  let spec = null;
  let raf = 0;

  function place() {
    raf = 0;
    if (!spec) { box.hidden = true; edge.hidden = true; return { found: false, visible: false }; }
    const el = pickTarget(spec.target);
    if (!el) { box.hidden = true; edge.hidden = true; return { found: false, visible: false }; }
    const r = el.getBoundingClientRect();
    // Visible area = the nearest scrolling pane (the shop), not the window, so
    // the marker sits at the bottom of the shop, never over the Teacher panel.
    const pane = scrollParent(el);
    const v = pane ? pane.getBoundingClientRect() : { top: 0, bottom: win.innerHeight, left: 0, right: win.innerWidth };
    const pad = 6;
    let direction = null;
    if (r.top > v.bottom - 24) direction = 'down';
    else if (r.bottom < v.top + 24) direction = 'up';
    box.hidden = !!direction;
    box.dataset.level = String(spec.level || 0);
    Object.assign(box.style, {
      top: `${r.top - pad}px`, left: `${r.left - pad}px`,
      width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px`,
    });
    edge.hidden = !direction;
    if (direction) {
      edge.dataset.dir = direction;
      edge.textContent = direction === 'down' ? '↓ Scroll down' : '↑ Scroll up';
      edge.style.left = `${Math.max(v.left + 16, Math.min(r.left + r.width / 2 - 85, v.right - 186))}px`;
      edge.style.top = direction === 'down' ? `${v.bottom - 56}px` : `${v.top + 16}px`;
    }
    return { found: true, visible: !direction, direction };
  }

  // A target may match several elements (a selector list, or the same control
  // in two places). Point at the one the person can actually reach: the first
  // that isn't covered by a popup, else the last match (popups render last).
  function pickTarget(sel) {
    const all = [...doc.querySelectorAll(sel)].filter((e) => e.getClientRects().length);
    if (all.length <= 1) return all[0] || null;
    const reachable = all.find((e) => {
      const r = e.getBoundingClientRect();
      const x = r.left + r.width / 2, y = r.top + Math.min(r.height / 2, 20);
      if (x < 0 || y < 0 || x > win.innerWidth || y > win.innerHeight) return false;
      const hit = doc.elementFromPoint(x, y);
      return !!hit && (e === hit || e.contains(hit) || hit.closest('.guide-box'));
    });
    return reachable || all[all.length - 1];
  }

  function scrollParent(el) {
    for (let n = el.parentElement; n && n !== doc.body; n = n.parentElement) {
      const o = win.getComputedStyle(n).overflowY;
      if ((o === 'auto' || o === 'scroll') && n.scrollHeight > n.clientHeight) return n;
    }
    return null;
  }

  const schedule = () => { if (!raf) raf = win.requestAnimationFrame(place); };
  win.addEventListener('scroll', schedule, true);
  win.addEventListener('resize', schedule);

  return {
    highlight(next) {
      spec = next && next.target ? { target: next.target, level: next.level || 0 } : null;
      return place();
    },
    /** Re-measure after the page re-renders. */
    refresh() { return place(); },
    clear() { spec = null; return place(); },
    destroy() { win.removeEventListener('scroll', schedule, true); win.removeEventListener('resize', schedule); box.remove(); edge.remove(); },
  };
}
