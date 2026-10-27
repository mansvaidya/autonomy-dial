// platewise.js — "Platewise", a fictional recipe and party-planning site.
//
// Flow: home → Plan a party (guests, diets, allergies, budget) → browse recipes
// with filters, add dishes to the party menu → review the menu → shopping list
// (scaled to the guest count) → send the list to Basketly.
//
// Like the shop, it reports facts through onChange(state) and marks the
// elements the agent may point at with data-guide. "Send list to Basketly" sits
// inside data-commit, so the agent's hands can never press it.

import { RECIPES, COURSES, ALLERGENS, recipe, hasNuts } from './recipes.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => `$${Math.round(n)}`;
const STAR = '★';

function img(r, cls = '') {
  return `<img class="${cls}" src="${esc(r.img.src)}" alt="${esc(r.name)}" loading="lazy" referrerpolicy="no-referrer" data-ph="${esc(r.name[0])}">`;
}

export function createPlatewise(root, { onChange = () => {}, onOpenBasketly = () => {} } = {}) {
  const doc = root.ownerDocument;
  const fresh = () => ({
    view: 'home', query: '',
    party: { guests: '', veg: '', allergies: [], budget: '', occasion: 'Birthday party' },
    started: false,
    filters: { course: 'all', vegOnly: false, nutFree: false, glutenFree: false, dairyFree: false },
    recipeId: null, menu: [], have: [], sent: false, lastAdded: null,
  });
  let st = fresh();

  const guests = () => Number(st.party.guests) || 10;
  const menuRecipes = () => st.menu.map(recipe).filter(Boolean);
  const total = () => menuRecipes().reduce((n, r) => n + r.cost * (guests() / 10), 0);

  function snapshot() {
    const m = menuRecipes();
    const nutDish = m.find(hasNuts);
    const p = st.party;
    return {
      view: st.view, plannerOpen: st.view !== 'home' || st.started, started: st.started,
      guests: Number(p.guests) || 0, vegCount: Number(p.veg) || 0, nutAllergy: p.allergies.includes('nuts'), budget: Number(p.budget) || 0,
      detailsOk: Number(p.guests) === 10 && Number(p.veg) === 2 && p.allergies.includes('nuts') && Number(p.budget) === 250,
      filters: { ...st.filters }, recipeId: st.recipeId,
      menuIds: [...st.menu], menuCount: m.length,
      menuHasMain: m.some((r) => r.course === 'main'),
      menuHasVegMain: m.some((r) => r.course === 'main' && r.veg),
      menuHasSide: m.some((r) => r.course === 'side'),
      menuHasDessert: m.some((r) => r.course === 'dessert'),
      menuHasNuts: !!nutDish, nutDish: nutDish ? nutDish.name : null, nutNote: nutDish ? nutDish.nutNote : null,
      total: Math.round(total()), overBudget: Number(p.budget) > 0 && total() > Number(p.budget),
      reviewed: ['review', 'list', 'sent'].includes(st.view), listMade: ['list', 'sent'].includes(st.view), sent: st.sent,
      lastAdded: st.lastAdded,
    };
  }
  const emit = () => onChange(snapshot());

  root.innerHTML = `<div class="pw-scroll"><div class="pw-header-slot"></div><main class="pw-main" tabindex="-1"></main></div>`;
  const scroller = root.querySelector('.pw-scroll');
  const $header = root.querySelector('.pw-header-slot');
  const $main = root.querySelector('.pw-main');

  function header() {
    $header.innerHTML = `
      <header class="pw-header">
        <button class="pw-logo" data-act="home" data-guide="pw-logo" aria-label="Platewise home">${logo()}<span>Platewise</span></button>
        <nav class="pw-nav" aria-label="Sections"><button data-act="browse-all">Recipes</button><button data-act="soon">Collections</button><button data-act="soon">Meal planner</button></nav>
        <form class="pw-search" role="search"><label class="sr-only" for="pw-q">Search recipes</label><span aria-hidden="true">⌕</span><input id="pw-q" type="search" placeholder="Search 2,000+ recipes" autocomplete="off" value="${esc(st.query)}"></form>
        <button class="pw-party-btn ${st.started ? 'on' : ''}" data-act="plan" data-guide="plan-party">🎉 ${st.started ? `Party menu (${st.menu.length})` : 'Plan a party'}</button>
      </header>
      <div class="pw-demo" role="note">Platewise is a demo recipe site for a research study. Costs are estimates for the demo.</div>`;
  }

  function render() {
    header();
    const view = { home, setup, browse, recipe: recipePage, review, list, sent }[st.view] || home;
    $main.innerHTML = view();
    root.querySelectorAll('[data-keep]').forEach((i) => { const k = i.dataset.keep; if (k in st.party && i.type !== 'checkbox') i.value = st.party[k]; });
  }
  function go(view, extra = {}) { Object.assign(st, extra, { view }); render(); scroller.scrollTop = 0; emit(); }

  // ── Views ──
  function home() {
    const picks = ['veg-lasagna', 'brownies', 'roast-chicken', 'caprese', 'mac-cheese', 'fruit-salad', 'risotto', 'garlic-bread'].map(recipe);
    return `
      <section class="pw-hero">
        <div><div class="pw-kicker">Hosting this weekend?</div><h1>Plan a party menu everyone can enjoy</h1>
        <p>Tell us your guests, their diets and your budget. We'll help you pick dishes and build one shopping list.</p>
        <button class="pw-primary" data-act="plan">🎉 Plan a party</button></div>
        <div class="pw-hero-img">${img(recipe('roast-chicken'))}</div>
      </section>
      <div class="pw-chips">${COURSES.map((c) => `<button class="pw-chip" data-act="course-browse" data-course="${c.id}">${esc(c.name)}</button>`).join('')}<button class="pw-chip" data-act="browse-all">Vegetarian</button><button class="pw-chip" data-act="browse-all">Under 30 minutes</button></div>
      <h2 class="pw-row-title">Popular this week</h2>
      <div class="pw-grid">${picks.map((r) => card(r, false)).join('')}</div>`;
  }

  function setup() {
    const p = st.party;
    const al = (k, l) => `<label class="pw-check"><input type="checkbox" data-act="allergy" data-allergy="${k}" ${p.allergies.includes(k) ? 'checked' : ''}> ${l}</label>`;
    return `
      <div class="pw-setup">
        <h1>Plan a party</h1>
        <p class="pw-muted">We'll filter recipes, scale them to your guest count and keep you on budget.</p>
        <form class="pw-card" data-guide="party-details" data-form="party" novalidate>
          <label>Occasion <select data-keep="occasion" data-field="occasion"><option>Birthday party</option><option>Family dinner</option><option>Holiday</option><option>Picnic</option></select></label>
          <div class="pw-two">
            <label>How many guests? <input type="number" min="1" max="60" inputmode="numeric" data-keep="guests" data-field="guests" data-guide="guests" placeholder="e.g. 10"></label>
            <label>How many are vegetarian? <input type="number" min="0" max="60" inputmode="numeric" data-keep="veg" data-field="veg" data-guide="veg" placeholder="e.g. 2"></label>
          </div>
          <fieldset><legend>Any allergies?</legend><div class="pw-checks" data-guide="allergies">${al('nuts', 'Nuts (peanuts and tree nuts)')}${al('gluten', 'Gluten')}${al('dairy', 'Dairy')}${al('shellfish', 'Shellfish')}</div></fieldset>
          <label>Food budget <span class="pw-money"><span>$</span><input type="number" min="0" inputmode="numeric" data-keep="budget" data-field="budget" data-guide="budget" placeholder="e.g. 250"></span></label>
          <button type="button" class="pw-primary big" data-act="start" data-guide="start-planning">Start planning</button>
          ${st.setupError ? `<p class="pw-error" role="alert">${esc(st.setupError)}</p>` : ''}
        </form>
      </div>`;
  }

  function filtered() {
    const f = st.filters;
    const q = st.query.trim().toLowerCase();
    return RECIPES.filter((r) => (f.course === 'all' || r.course === f.course)
      && (!f.vegOnly || r.veg) && (!f.nutFree || !hasNuts(r)) && (!f.glutenFree || !r.allergens.includes('gluten')) && (!f.dairyFree || !r.allergens.includes('dairy'))
      && (!q || `${r.name} ${r.blurb} ${r.course}`.toLowerCase().includes(q.replace(/s$/, ''))));
  }

  function browse() {
    const f = st.filters;
    const list = filtered();
    const box = (key, label, guide) => `<label class="pw-check ${f[key] ? 'on' : ''}" ${guide ? `data-guide="${guide}"` : ''}><input type="checkbox" data-act="filter" data-filter="${key}" ${f[key] ? 'checked' : ''}> ${label}</label>`;
    return `
      <div class="pw-browse">
        <aside class="pw-filters" aria-label="Filters">
          <h2>Filters</h2>
          <div class="pw-fgroup"><div class="pw-flabel">Course</div>
            <div class="pw-course" role="group" aria-label="Course">${[['all', 'All courses'], ...COURSES.map((c) => [c.id, c.name])].map(([id, n]) => `<button class="pw-chip ${f.course === id ? 'on' : ''}" aria-pressed="${f.course === id}" data-act="course" data-course="${id}" ${id === 'all' ? 'data-guide="course-all"' : ''}>${esc(n)}</button>`).join('')}</div></div>
          <div class="pw-fgroup"><div class="pw-flabel">Diet</div>${box('vegOnly', '🌱 Vegetarian only')}</div>
          <div class="pw-fgroup"><div class="pw-flabel">Free from</div>${box('nutFree', '🥜 Nut-free', 'filter-nuts')}${box('glutenFree', 'Gluten-free')}${box('dairyFree', 'Dairy-free')}</div>
          <button class="pw-link" data-act="clear-filters">Clear filters</button>
        </aside>
        <section class="pw-results" data-guide="menu-grid">
          <div class="pw-results-head"><h1>${st.query ? `Recipes for “${esc(st.query)}”` : 'Recipes for your party'}</h1><span class="pw-muted">${list.length} recipes · scaled to ${guests()} guests</span></div>
          ${list.length ? `<div class="pw-grid">${list.map((r) => card(r, true)).join('')}</div>` : '<p class="pw-muted">No recipes match these filters. Try clearing one.</p>'}
        </section>
        ${plan()}
      </div>`;
  }

  function card(r, addable) {
    const inMenu = st.menu.includes(r.id);
    const tags = [r.veg ? '<span class="pw-tag veg">🌱 Vegetarian</span>' : '', hasNuts(r) ? '<span class="pw-tag nut">⚠ Contains nuts</span>' : ''].join('');
    return `
      <article class="pw-rcard" data-guide="recipe-${r.id}">
        <button class="pw-rhit" data-act="open" data-id="${r.id}" aria-label="${esc(r.name)}, ${r.rating} stars, ${esc(r.time)}">
          <div class="pw-rimg">${img(r)}</div>
          <div class="pw-rbody"><div class="pw-course-label">${esc(COURSES.find((c) => c.id === r.course).name.replace(/s?( & salads)?$/, ''))}</div>
            <div class="pw-rname">${esc(r.name)}</div>
            <div class="pw-rmeta"><span class="pw-stars">${STAR} ${r.rating}</span> (${r.reviews.toLocaleString()}) · ${esc(r.time)}</div>
            <div class="pw-tags">${tags}</div></div>
        </button>
        ${addable ? `<div class="pw-radd">${inMenu ? `<button class="pw-added" data-act="remove" data-id="${r.id}" aria-label="Remove ${esc(r.name)} from menu">✓ In menu</button>` : `<button class="pw-addbtn" data-act="add" data-id="${r.id}" data-guide="add-${r.id}" aria-label="Add ${esc(r.name)} to party menu">＋ Add · ${money(r.cost * guests() / 10)}</button>`}</div>` : ''}
      </article>`;
  }

  function plan() {
    const p = st.party;
    const t = total();
    const budget = Number(p.budget) || 0;
    const pct = budget ? Math.min(100, Math.round((t / budget) * 100)) : 0;
    const slots = COURSES.map((c) => {
      const items = menuRecipes().filter((r) => r.course === c.id);
      return `<div class="pw-slot"><div class="pw-slot-name">${esc(c.name)}</div>${items.length ? items.map((r) => `<div class="pw-mi ${hasNuts(r) ? 'warn' : ''}">${img(r, 'pw-mi-img')}<div><div class="pw-mi-name">${esc(r.name)}</div><div class="pw-mi-meta">${r.veg ? '🌱 ' : ''}${money(r.cost * guests() / 10)}${hasNuts(r) ? ' · <strong>contains nuts</strong>' : ''}</div></div><button class="pw-x" data-act="remove" data-id="${r.id}" aria-label="Remove ${esc(r.name)}">✕</button></div>`).join('') : '<div class="pw-empty-slot">Nothing yet</div>'}</div>`;
    }).join('');
    const nut = menuRecipes().find(hasNuts);
    return `
      <aside class="pw-plan" aria-label="Your party menu" data-guide="menu-panel">
        <h2>Your party menu</h2>
        <div class="pw-brief">${esc(p.occasion)} · ${guests()} guests${Number(p.veg) ? ` · ${Number(p.veg)} vegetarian` : ''}${p.allergies.length ? ` · ${p.allergies.map((a) => ALLERGENS[a] || a).join(', ').toLowerCase()} allergy` : ''}</div>
        ${nut && p.allergies.includes('nuts') ? `<div class="pw-alert" role="alert">⚠ ${esc(nut.name)} contains nuts. ${esc(nut.nutNote || '')}</div>` : ''}
        ${slots}
        <div class="pw-budget" data-guide="budget-bar"><div class="pw-budget-row"><span>Estimated cost</span><strong>${money(t)}${budget ? ` of ${money(budget)}` : ''}</strong></div>
          ${budget ? `<div class="pw-bar ${t > budget ? 'over' : ''}"><span style="width:${pct}%"></span></div>` : ''}</div>
        <button class="pw-primary big" data-act="review" data-guide="review-menu" ${st.menu.length ? '' : 'disabled'}>Review menu</button>
      </aside>`;
  }

  function recipePage() {
    const r = recipe(st.recipeId);
    if (!r) return browse();
    const n = guests();
    const inMenu = st.menu.includes(r.id);
    const scale = n / 10;
    return `
      <div class="pw-browse pw-recipe-layout">
        <article class="pw-recipe">
          <button class="pw-link" data-act="back">‹ Back to recipes</button>
          <div class="pw-recipe-top">
            <div class="pw-recipe-img">${img(r)}</div>
            <div>
              <div class="pw-course-label">${esc(COURSES.find((c) => c.id === r.course).name)}</div>
              <h1>${esc(r.name)}</h1>
              <div class="pw-rmeta"><span class="pw-stars">${STAR.repeat(5)}</span> ${r.rating} (${r.reviews.toLocaleString()} reviews) · ${esc(r.time)}</div>
              <p>${esc(r.blurb)}</p>
              <div class="pw-tags">${r.veg ? '<span class="pw-tag veg">🌱 Vegetarian</span>' : '<span class="pw-tag">Contains meat or fish</span>'}</div>
              <div class="pw-allergens ${hasNuts(r) ? 'nut' : ''}" data-guide="allergens"><strong>Allergens:</strong> ${r.allergens.length ? r.allergens.map((a) => ALLERGENS[a]).join(', ') : 'None of the common allergens'}${r.nutNote ? `. ${esc(r.nutNote)}` : ''}</div>
              <div class="pw-cost">Serves ${n} · about ${money(r.cost * scale)}</div>
              ${inMenu ? `<button class="pw-added big" data-act="remove" data-id="${r.id}">✓ In your party menu · Remove</button>`
                : `<button class="pw-primary big" data-act="add" data-id="${r.id}" data-guide="add-to-menu">＋ Add to party menu</button>`}
            </div>
          </div>
          <div class="pw-recipe-cols">
            <section><h2>Ingredients <small>for ${n}</small></h2><ul class="pw-ing">${r.ingredients.map(([name, q, u]) => `<li><span>${fmtQty(q * scale)} ${esc(u)}</span> ${esc(name)}</li>`).join('')}</ul></section>
            <section><h2>Method</h2><ol class="pw-steps">${r.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></section>
          </div>
          <p class="pw-credit">Photo: ${esc(r.img.credit.author)}, ${esc(r.img.credit.license)}, via Wikimedia Commons (<a href="credits.html" target="_blank" rel="noopener">all credits</a>).</p>
        </article>
        ${plan()}
      </div>`;
  }

  function review() {
    const s = snapshot();
    const p = st.party;
    const check = (ok, text) => `<li class="${ok ? 'ok' : 'bad'}"><span aria-hidden="true">${ok ? '✓' : '!'}</span> ${text}</li>`;
    const needsNutFree = p.allergies.includes('nuts');
    return `
      <div class="pw-review">
        <button class="pw-link" data-act="browse-back">‹ Back to recipes</button>
        <h1>Review your menu</h1>
        <ul class="pw-checklist" data-guide="checklist">
          ${needsNutFree ? check(!s.menuHasNuts, s.menuHasNuts ? `${esc(s.nutDish)} contains nuts` : 'Everything is nut-free') : ''}
          ${Number(p.veg) ? check(s.menuHasVegMain, s.menuHasVegMain ? `There's a vegetarian main for your ${Number(p.veg)} vegetarian guests` : 'No vegetarian main yet') : ''}
          ${check(s.menuHasMain && s.menuHasSide && s.menuHasDessert, 'A main, a side and a dessert')}
          ${Number(p.budget) ? check(!s.overBudget, `Estimated ${money(total())} of your ${money(Number(p.budget))} budget`) : ''}
        </ul>
        <div class="pw-review-grid">${menuRecipes().map((r) => `<div class="pw-mi big">${img(r, 'pw-mi-img')}<div><div class="pw-mi-name">${esc(r.name)}</div><div class="pw-mi-meta">${r.veg ? '🌱 Vegetarian · ' : ''}${money(r.cost * guests() / 10)}</div></div><button class="pw-x" data-act="remove" data-id="${r.id}" aria-label="Remove ${esc(r.name)}">✕</button></div>`).join('')}</div>
        <button class="pw-primary big" data-act="make-list" data-guide="make-list">Make shopping list</button>
      </div>`;
  }

  function aggregate() {
    const map = new Map();
    const scale = guests() / 10;
    for (const r of menuRecipes()) for (const [name, q, u, bk] of r.ingredients) {
      const key = `${name.toLowerCase()}|${u}`;
      const prev = map.get(key) || { name, unit: u, qty: 0, basketly: bk || null, for: [] };
      prev.qty += q * scale; prev.for.push(r.name);
      map.set(key, prev);
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  function list() {
    const items = aggregate();
    return `
      <div class="pw-review">
        <button class="pw-link" data-act="back-review">‹ Back to menu</button>
        <h1>Shopping list</h1>
        <p class="pw-muted">For ${guests()} guests. Untick anything you already have at home.</p>
        <ul class="pw-shop" data-guide="shopping-list">${items.map((it, i) => `<li><label><input type="checkbox" data-act="have" data-ix="${i}" ${st.have.includes(i) ? '' : 'checked'}> <strong>${fmtQty(it.qty)} ${esc(it.unit)}</strong> ${esc(it.name)}</label><small>${esc(it.for.join(', '))}</small></li>`).join('')}</ul>
        <div class="pw-send" data-guide="send-list" data-commit>
          <button class="pw-primary big" data-act="send">Send list to Basketly</button>
          <p class="pw-muted small">Items go into your Basketly cart, where you can still change them before ordering.</p>
        </div>
        <button class="pw-link" data-act="print">Print list</button>
      </div>`;
  }

  function sent() {
    const n = aggregate().filter((_, i) => !st.have.includes(i)).length;
    return `
      <div class="pw-sent">
        <div class="pw-ok" aria-hidden="true">✓</div>
        <h1>Your list is in Basketly</h1>
        <p>${n} items were added to your Basketly cart. Nothing is ordered until you check out there.</p>
        <button class="pw-primary" data-act="open-basketly">Open my Basketly cart</button>
        <button class="pw-link" data-act="home">Back to Platewise</button>
      </div>`;
  }

  // ── Events (the person's, or the agent's hands) ──
  root.addEventListener('submit', (e) => {
    if (e.target.matches('.pw-search')) {
      e.preventDefault();
      st.query = e.target.querySelector('input').value.trim();
      go('browse', { recipeId: null });
    } else e.preventDefault();
  });

  root.addEventListener('input', (e) => {
    const f = e.target.dataset.field;
    if (!f) return;
    st.party[f] = e.target.value;
    st.setupError = '';
    emit();
  });
  root.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.field) { st.party[t.dataset.field] = t.value; return emit(); }
    const a = t.dataset.act;
    if (a === 'allergy') {
      const k = t.dataset.allergy;
      st.party.allergies = t.checked ? [...new Set([...st.party.allergies, k])] : st.party.allergies.filter((x) => x !== k);
      return emit();
    }
    if (a === 'filter') { st.filters[t.dataset.filter] = t.checked; keepScroll(render); return emit(); }
    if (a === 'have') { const i = Number(t.dataset.ix); st.have = t.checked ? st.have.filter((x) => x !== i) : [...st.have, i]; return emit(); }
  });

  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || !root.contains(b) || b.tagName === 'INPUT') return;
    const a = b.dataset.act;
    switch (a) {
      case 'home': return go('home', { recipeId: null });
      case 'plan': return go(st.started ? 'browse' : 'setup', { recipeId: null });
      case 'browse-all': return go(st.started ? 'browse' : 'setup');
      case 'course-browse': st.filters.course = b.dataset.course; return go(st.started ? 'browse' : 'setup');
      case 'soon': return toast('That part of Platewise isn\'t available in this demo.');
      case 'start': {
        const p = st.party;
        if (!(Number(p.guests) > 0)) { st.setupError = 'Please enter how many guests are coming.'; keepScroll(render); return emit(); }
        st.started = true;
        if (p.allergies.includes('nuts')) st.filters.nutFree = st.filters.nutFree || false;
        return go('browse');
      }
      case 'course': st.filters.course = b.dataset.course; keepScroll(render); return emit();
      case 'clear-filters': st.filters = { course: 'all', vegOnly: false, nutFree: false, glutenFree: false, dairyFree: false }; keepScroll(render); return emit();
      case 'open': return go('recipe', { recipeId: b.dataset.id });
      case 'back': case 'browse-back': return go('browse', { recipeId: null });
      case 'add': {
        const id = b.dataset.id;
        if (!st.started) { st.started = true; }
        if (!st.menu.includes(id)) st.menu.push(id);
        st.lastAdded = id;
        keepScroll(render); return emit();
      }
      case 'remove': st.menu = st.menu.filter((x) => x !== b.dataset.id); keepScroll(render); return emit();
      case 'review': return go('review');
      case 'make-list': return go('list', { have: [] });
      case 'back-review': return go('review');
      case 'print': return toast('Printing isn\'t available in this demo.');
      case 'send': st.sent = true; return go('sent');
      case 'open-basketly': return onOpenBasketly(aggregate().filter((_, i) => !st.have.includes(i)));
      default: return undefined;
    }
  });

  root.addEventListener('error', (e) => {
    const im = e.target;
    if (!im || im.tagName !== 'IMG' || !im.dataset.ph) return;
    const ph = doc.createElement('div');
    ph.className = `ph ${im.className}`.trim();
    ph.setAttribute('aria-hidden', 'true');
    ph.textContent = im.dataset.ph;
    im.replaceWith(ph);
  }, true);

  function keepScroll(fn) { const top = scroller.scrollTop; fn(); scroller.scrollTop = top; }
  let toastTimer = 0;
  function toast(text) {
    let t = root.querySelector('.pw-toast');
    if (!t) { t = doc.createElement('div'); t.className = 'pw-toast'; t.setAttribute('role', 'status'); root.append(t); }
    t.textContent = text; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
  }

  render();
  return { get state() { return snapshot(); }, emit, reset() { st = fresh(); render(); emit(); } };
}

function fmtQty(n) {
  if (n >= 10 || Number.isInteger(n)) return String(Math.round(n * 10) / 10);
  const whole = Math.floor(n), frac = n - whole;
  const f = [[0.25, '¼'], [0.5, '½'], [0.75, '¾'], [0.33, '⅓'], [0.67, '⅔']].find(([v]) => Math.abs(frac - v) < 0.06);
  if (f) return `${whole || ''}${f[1]}`;
  return String(Math.round(n * 10) / 10);
}

function logo() {
  return `<svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true"><circle cx="16" cy="16" r="13" fill="#fff4e6" stroke="#e8590c" stroke-width="2.5"/><circle cx="16" cy="16" r="7.5" fill="none" stroke="#e8590c" stroke-width="2"/><path d="M5 4v7M3 4v4a2 2 0 0 0 4 0V4M27 4c-2 1-3 4-3 7h3v15" stroke="#2b8a3e" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>`;
}
