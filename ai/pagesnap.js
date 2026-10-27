// pagesnap.js — turns the visible website into a short text outline the AI can
// read, with a number [n] for every control so it can point at or use it.
//
//   [4] button "Summit Warehouse Club, Warehouse club, Delivery by 4:30pm"
//   [9] textbox "Search Summit Warehouse Club…" value=""
//   [31] textbox "Street address" PRIVATE (the person types this; filled: no)
//   [40] button "Place order" FINAL DECISION (only the person clicks this)
//
// What the person typed into private fields is never included, only whether
// the field is filled. The AI sees the page as a visitor would; it is not told
// the scripted lesson's steps or the data-guide markers.

const CONTROL = 'button, a[href], input, select, textarea, summary, [role="button"], [role="link"], [role="checkbox"], [role="radio"], [data-act]';
const PRIVATE = '[data-private], [data-private-opt], input[type="password"], input[autocomplete^="cc-"]';
const COMMIT = '[data-commit]';
const MAX_ITEMS = 220;

const clean = (s, n = 90) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);

function visible(el) {
  if (!el.getClientRects().length) return false;
  const cs = el.ownerDocument.defaultView.getComputedStyle(el);
  return cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05;
}

function nameOf(el) {
  const aria = el.getAttribute('aria-label');
  if (aria) return aria;
  if (el.id) { const l = el.ownerDocument.querySelector(`label[for="${CSS.escape(el.id)}"]`); if (l) return l.textContent; }
  const wrap = el.closest('label');
  if (wrap && wrap !== el) return wrap.textContent;
  if (el.matches('input, textarea')) return el.placeholder || el.name || el.type;
  if (el.tagName === 'SELECT') { const l = el.closest('label'); return l ? l.textContent : el.name; }
  return el.textContent || el.title || '';
}

function roleOf(el) {
  if (el.matches('input[type="checkbox"], [role="checkbox"]')) return 'checkbox';
  if (el.matches('input[type="radio"], [role="radio"]')) return 'radio';
  if (el.matches('input[type="number"]')) return 'number field';
  if (el.matches('input, textarea')) return 'textbox';
  if (el.tagName === 'SELECT') return 'dropdown';
  if (el.matches('a[href], [role="link"]')) return 'link';
  return 'button';
}

/**
 * @param {HTMLElement} root  the website's container
 * @returns {{ text: string, refs: Map<number, Element>, title: string }}
 */
export function snapshot(root) {
  const doc = root.ownerDocument;
  const refs = new Map();
  const lines = [];
  let n = 0;

  const dialog = root.querySelector('[role="dialog"], .drawer, .modal');
  const scope = dialog && visible(dialog) ? dialog : null;
  const heads = [...root.querySelectorAll('h1, h2')].filter(visible).map((h) => clean(h.textContent, 60));
  const title = heads[0] || '';

  // Controls inside an open popup come first: that's what the person sees.
  const all = [...root.querySelectorAll(CONTROL)].filter((el) => visible(el) && !el.closest('[aria-hidden="true"]'));
  const seen = new Set();
  const ordered = scope ? [...all.filter((e) => scope.contains(e)), ...all.filter((e) => !scope.contains(e))] : all;
  for (const el of ordered) {
    // Skip a control nested inside another control we already listed.
    if ([...seen].some((s) => s !== el && s.contains(el) && !el.matches('input, select, textarea'))) continue;
    if (n >= MAX_ITEMS) break;
    seen.add(el);
    n += 1;
    refs.set(n, el);
    const role = roleOf(el);
    let line = `[${n}] ${role} "${clean(nameOf(el))}"`;
    const isPrivate = el.matches(PRIVATE) || !!el.closest(PRIVATE);
    if (el.matches('input, textarea') && !el.matches('[type="checkbox"], [type="radio"]')) {
      line += isPrivate ? ` PRIVATE (the person types this; filled: ${el.value.trim() ? 'yes' : 'no'})` : ` value="${clean(el.value, 40)}"`;
    } else if (isPrivate) line += ' PRIVATE (the person does this)';
    if (el.matches('[type="checkbox"], [type="radio"]')) line += el.checked ? ' (checked)' : ' (not checked)';
    if (el.tagName === 'SELECT') line += ` value="${clean(el.value, 30)}"`;
    if (el.getAttribute('aria-pressed') === 'true' || el.getAttribute('aria-checked') === 'true' || el.classList.contains('on')) line += ' (selected)';
    if (el.disabled) line += ' (disabled)';
    if (el.closest(COMMIT)) line += ' FINAL DECISION (only the person clicks this)';
    if (scope && scope.contains(el)) line = `${line} [in popup]`;
    const r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > doc.defaultView.innerHeight) line += ' (off screen)';
    lines.push(line);
  }

  // A little non-control text that matters: alerts, totals, errors, checklists.
  const notes = [...root.querySelectorAll('[role="alert"], .field-error, .pw-alert, .pw-checklist li, .trow.total, .pw-budget-row, .bk-demo, .pw-demo')]
    .filter(visible).map((e) => `- ${clean(e.textContent, 140)}`).filter((l) => l.length > 3).slice(0, 12);

  const text = [
    `Page: ${title || '(untitled)'}${scope ? ' (a popup is open on top of the page)' : ''}`,
    heads.length > 1 ? `Headings: ${heads.slice(0, 8).join(' | ')}` : '',
    notes.length ? `Notices:\n${notes.join('\n')}` : '',
    `Controls (${n}${all.length > n ? ` of ${all.length}` : ''}):`,
    lines.join('\n'),
  ].filter(Boolean).join('\n');
  return { text, refs, title };
}

/** A short signature of the page, to notice meaningful changes. */
export function signature(root) {
  const heads = [...root.querySelectorAll('h1, h2')].filter(visible).map((h) => h.textContent.trim()).join('|');
  const dialog = !!root.querySelector('[role="dialog"], .drawer');
  const counts = [...root.querySelectorAll('.n, .cart-count, .pw-party-btn, .on, [aria-pressed="true"], :checked')].map((e) => e.textContent.trim() + (e.checked ? '✓' : '')).join('|');
  const alerts = [...root.querySelectorAll('[role="alert"], .pw-alert')].map((e) => e.textContent.trim()).join('|');
  return `${heads}#${dialog}#${counts}#${alerts}`;
}
