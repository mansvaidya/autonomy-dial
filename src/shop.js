// shop.js — "Basketly", a fictional grocery delivery marketplace for study
// sessions. It follows the layout people know from grocery delivery apps
// (store picker → storefront with aisles → product popup → cart drawer →
// checkout), but the brand, the stores and the store-brand items are invented.
// Nothing is bought, nothing is sent anywhere, and no payment is taken.
//
// The shop reports state after every change through onChange(state). The
// state carries only FACTS the Teacher needs ("the address is filled in"),
// never what the person typed in private fields.
//
// Elements the Teacher may point at carry data-guide="…" attributes.

import { STORES, AISLES, BAKERY_SUBS, PRODUCTS, product, store, carries, offer, storeProducts, matches, hasNuts, isCake, glutenFree, allergenText } from './catalog.js';
import { checkCard, formatCardNumber } from './payment.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => `$${n.toFixed(2)}`;
const priceHtml = (n) => { const [d, c] = n.toFixed(2).split('.'); return `<span class="cur">$</span>${d}<sup>${c}</sup>`; };
const aisleName = (id) => (AISLES.find((a) => a.id === id) || {}).name || id;

const DEMO_ADDRESS = 'Anytown, 12345';
const SLOTS = [['9am–11am', 3.99], ['11am–1pm', 3.99], ['1pm–3pm', 2.99], ['3pm–5pm', 2.99], ['5pm–7pm', 4.99]];
const TIPS = [0, 10, 15, 20];

function days() {
  const out = [];
  const d = new Date();
  for (let i = 0; i < 4; i++) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i);
    const name = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : x.toLocaleDateString(undefined, { weekday: 'long' });
    out.push({ id: name, label: name, date: x.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) });
  }
  return out;
}

function storeLogo(s, size = 44) {
  return `<span class="slogo" style="--c:${s.color};--a:${s.accent};width:${size}px;height:${size}px;font-size:${Math.round(size * 0.45)}px" aria-hidden="true">${esc(s.glyph)}</span>`;
}

function img(p, cls = '', which = 'img') {
  const im = p[which] || p.img;
  if (!im) return `<div class="ph ${cls}" aria-hidden="true">${esc(p.name[0])}</div>`;
  return `<img class="${cls}" src="${esc(im.src)}" alt="${esc(p.name)}" loading="lazy" referrerpolicy="no-referrer" data-ph="${esc(p.name[0])}">`;
}

/**
 * @param {HTMLElement} root
 * @param {{onChange?:(state:object)=>void}} [opts]
 */
export function createShop(root, { onChange = () => {} } = {}) {
  const doc = root.ownerDocument;
  const fresh = () => ({
    page: 'home', storeId: null, aisleId: null, query: '', sort: 'relevance', kind: 'all',
    productId: null, size: null, message: '', qty: 1, sizeError: false, justAdded: false,
    cartOpen: false, cart: [], day: null, slot: null, addressFilled: false, gift: false, tip: 15,
    placeError: '', orderNo: null, lastOrder: null, menuOpen: false,
    filters: { nutFree: false, glutenFree: false, under20: false }, bakerySub: null,
    opened: {}, addrOpen: false, pricingOpen: false, cardValid: false, cardErrors: {},
  });
  // Kept across resets of a single order: favorites and past orders.
  const favs = new Set();
  const orders = [];
  let st = fresh();

  // ── State the Teacher sees ──
  function view() {
    if (st.page === 'checkout' || st.page === 'confirmation') return st.page;
    if (st.productId) return 'product';
    if (st.cartOpen) return 'cart';
    return st.page === 'search' ? 'results' : st.page;
  }
  const cartCount = () => st.cart.reduce((n, l) => n + l.qty, 0);
  function snapshot() {
    return {
      view: view(), page: st.page, storeId: st.storeId, aisleId: st.aisleId, query: st.query,
      productId: st.productId, size: st.size, messageFilled: !!st.message.trim(),
      cartOpen: st.cartOpen, cartCount: cartCount(), cartHasMessage: st.cart.some((l) => !!l.message),
      cartHasCake: st.cart.some((l) => isCake(product(l.id))),
      cartHasNutCake: st.cart.some((l) => isCake(product(l.id)) && hasNuts(product(l.id))),
      filters: { ...st.filters }, bakerySub: st.bakerySub,
      productIsCake: isCake(product(st.productId)), productHasNuts: st.productId ? hasNuts(product(st.productId)) : null,
      detailsOpened: !!st.opened.details, ingredientsOpened: !!st.opened.ingredients,
      allergensOpened: !!st.opened.allergens, reviewsOpened: !!st.opened.reviews,
      deliveryDay: st.slot ? `${st.day} ${st.slot}` : null, addressFilled: st.addressFilled,
      cardValid: st.cardValid, orders: orders.length, favorites: favs.size,
      days: days().map((d) => d.id),
    };
  }
  const emit = () => onChange(snapshot());

  // ── Layout: header + page + overlays, rendered separately so typing in one
  // place is never wiped by a re-render somewhere else. ──
  root.innerHTML = `<div class="bk-scroll"><div class="bk-header-slot"></div><main class="bk-main" id="bk-main" tabindex="-1"></main></div><div class="bk-modal-slot"></div><div class="bk-drawer-slot"></div>`;
  const scroller = root.querySelector('.bk-scroll');
  const $header = root.querySelector('.bk-header-slot');
  const $main = root.querySelector('.bk-main');
  const $modal = root.querySelector('.bk-modal-slot');
  const $drawer = root.querySelector('.bk-drawer-slot');

  function renderHeader() {
    const s = store(st.storeId);
    const inStore = s && st.page !== 'home' && st.page !== 'checkout' && st.page !== 'confirmation';
    if (st.page === 'checkout') {
      $header.innerHTML = `<header class="bk-header checkout-head"><button class="bk-logo" data-act="home" data-guide="logo" aria-label="Basketly home">${logoSvg()}<span>basketly</span></button><span class="secure">🔒 Secure checkout</span><button class="link" data-act="back-to-store">‹ Back to ${esc(s ? s.name : 'store')}</button></header>`;
      return;
    }
    const n = cartCount();
    $header.innerHTML = `
      <header class="bk-header">
        <button class="icon-btn" data-act="menu" aria-label="Menu" aria-expanded="${st.menuOpen}">☰</button>
        <button class="bk-logo" data-act="home" data-guide="logo" aria-label="Basketly home">${logoSvg()}<span>basketly</span></button>
        <div class="seg" role="group" aria-label="Order type"><button class="on" aria-pressed="true">Delivery</button><button aria-pressed="false" data-act="pickup">Pickup</button></div>
        <button class="addr" data-act="address" aria-expanded="${st.addrOpen}" aria-label="Delivery address: ${DEMO_ADDRESS}">📍 <span>${DEMO_ADDRESS}</span> ▾</button>
        <form class="bk-search" role="search" data-guide="search">
          <span aria-hidden="true">⌕</span>
          <label class="sr-only" for="bk-q">${inStore ? `Search ${esc(s.name)}` : 'Search products and stores'}</label>
          <input id="bk-q" type="search" autocomplete="off" placeholder="${inStore ? `Search ${esc(s.name)}…` : 'Search products and stores'}" value="${esc(st.query)}">
        </form>
        <button class="bk-cart ${n ? 'has' : ''}" data-act="cart" data-guide="cart" aria-label="Cart, ${n} item${n === 1 ? '' : 's'}">🛒 <span class="n">${n}</span></button>
      </header>
      ${st.menuOpen ? `<nav class="bk-menu" aria-label="Account"><div class="who">Hi, Guest</div>${[['orders', 'Your orders'], ['lists', 'Your lists'], ['', 'Credits & promos'], ['', 'Basketly+ membership'], ['help', 'Help center'], ['', 'Account settings']].map(([pg, x]) => `<button data-act="${pg ? 'page' : 'menu-item'}" data-page="${pg}">${x}</button>`).join('')}</nav>` : ''}
      ${st.addrOpen ? `<div class="bk-pop addr-pop" role="dialog" aria-label="Delivery address"><strong>Delivering to</strong><p>${DEMO_ADDRESS}</p><p class="muted small">In this demo, you type the full street address at checkout.</p><button class="secondary" data-act="address">Done</button></div>` : ''}
      <div class="bk-demo" role="note">Basketly is a demo shop for a research study. Stores are fictional; nothing is bought. Use only the printed test card, never a real one.</div>`;
  }

  function renderMain() {
    const fn = { home, store: storePage, aisle: aislePage, search: searchPage, checkout, confirmation, buyagain: buyAgain, deals, orders: ordersPage, lists: listsPage, help: helpPage }[st.page] || home;
    $main.innerHTML = fn();
  }

  function renderModal() {
    if (st.pricingOpen && !st.productId) { $modal.innerHTML = pricingModal(); return; }
    if (!st.productId) { $modal.innerHTML = ''; return; }
    $modal.innerHTML = productModal();
    const msg = $modal.querySelector('#bk-msg');
    if (msg) msg.value = st.message;
  }

  function renderDrawer() { $drawer.innerHTML = st.cartOpen ? cartDrawer() : ''; }

  function renderAll() { renderHeader(); renderMain(); renderModal(); renderDrawer(); scroller.classList.toggle('bk-locked', !!(st.productId || st.cartOpen)); }

  function go(page, extra = {}) {
    Object.assign(st, extra, { page, menuOpen: false, addrOpen: false });
    renderAll();
    scroller.scrollTop = 0;
    $main.focus({ preventScroll: true });
    emit();
  }

  // ── Pages ──
  function home() {
    const kinds = [['all', 'All stores'], ['Groceries', 'Groceries'], ['Warehouse', 'Warehouse'], ['Flowers', 'Flowers & gifts'], ['Pharmacy', 'Pharmacy'], ['Organic', 'Organic'], ['International', 'International'], ['Party', 'Party']];
    const shown = STORES.filter((s) => st.kind === 'all' || s.kind.toLowerCase().includes(st.kind.toLowerCase()) || s.tags.join(' ').toLowerCase().includes(st.kind.toLowerCase()));
    return `
      <section class="hero-band">
        <div><h1>Order groceries for delivery or pickup today</h1><p>Shop from local stores and warehouse clubs. Delivery in as little as 2 hours.</p></div>
        <div class="promo">$0 delivery fees on your first 3 orders<small>Demo offer. Terms don't apply because nothing is real.</small></div>
      </section>
      <div class="chips" role="group" aria-label="Filter stores">${kinds.map(([k, l]) => `<button class="chip ${st.kind === k ? 'on' : ''}" aria-pressed="${st.kind === k}" data-act="kind" data-kind="${k}">${l}</button>`).join('')}</div>
      <h2 class="row-title">Stores near you</h2>
      <div class="store-grid">${shown.map(storeCard).join('')}</div>
      <h2 class="row-title">Popular right now</h2>
      <div class="row-scroll">${PRODUCTS.filter((p) => p.badge === 'Best seller').map((p) => card(p, store('greenway'))).join('')}</div>`;
  }

  function storeCard(s) {
    return `
      <article class="store-card" data-guide="store-${s.id}">
        <button data-act="store" data-id="${s.id}" aria-label="${esc(s.name)}, ${esc(s.kind)}, ${esc(s.eta)}">
          ${storeLogo(s, 64)}
          <div class="sc-body"><div class="sc-name">${esc(s.name)}</div>
            <div class="sc-eta">${esc(s.eta)}</div>
            <div class="sc-tags">${s.tags.map((t) => `<span>${esc(t)}</span>`).join('')}</div>
            <div class="sc-fee">${esc(s.fee)}</div></div>
        </button>
      </article>`;
  }

  function sidebar(s) {
    const aisles = AISLES.filter((a) => storeProducts(s).some((p) => p.aisle === a.id));
    const nav = [['store', 'Storefront', '🏠'], ['buyagain', 'Buy it again', '↻'], ['deals', 'Deals', '🏷'], ['lists', 'Your lists', '♡'], ['orders', 'Your orders', '🧾']];
    return `
      <aside class="store-side">
        <div class="ss-head">${storeLogo(s, 72)}<div class="ss-name">${esc(s.name)}</div><div class="ss-eta">${esc(s.eta)}</div>
          <div class="ss-tags">${s.tags.map((t) => `<span>${esc(t)}</span>`).join(' · ')}</div><button class="link small" data-act="pricing">Pricing policy</button></div>
        <nav class="ss-nav" aria-label="Store">${nav.map(([p, l, i]) => `<button class="${st.page === p ? 'on' : ''}" data-act="nav" data-page="${p}"><span aria-hidden="true">${i}</span> ${l}</button>`).join('')}</nav>
        <div class="ss-aisles"><div class="ss-label">Browse aisles</div>${aisles.map((a) => `<button class="${st.page === 'aisle' && st.aisleId === a.id ? 'on' : ''}" data-act="aisle" data-id="${a.id}">${esc(a.name)}</button>`).join('')}</div>
      </aside>`;
  }

  function storeShell(s, inner) {
    const aisles = AISLES.filter((a) => storeProducts(s).some((p) => p.aisle === a.id));
    return `<div class="store-layout">${sidebar(s)}<div class="store-content">
      <div class="aisle-chips" role="group" aria-label="Aisles">${aisles.map((a) => `<button class="chip" data-act="aisle" data-id="${a.id}">${esc(a.name)}</button>`).join('')}</div>
      ${inner}</div></div>`;
  }

  function storePage() {
    const s = store(st.storeId);
    if (!s) return home();
    const items = storeProducts(s);
    const order = s.bulk ? ['produce', 'bakery', 'dairy', 'meat', 'deli', 'snacks', 'beverages', 'breakfast', 'pantry', 'candy', 'frozen', 'household', 'flowers'] : AISLES.map((a) => a.id);
    const rows = order.map((id) => [id, items.filter((p) => p.aisle === id)]).filter(([, l]) => l.length);
    return storeShell(s, `
      <section class="store-banner" style="--c:${s.color};--a:${s.accent}">
        <div><div class="sb-kicker">${esc(s.kind)}</div><h1>${esc(s.name)}</h1><p>${s.bulk ? 'Warehouse prices on bulk sizes, delivered. Membership not required for this demo.' : 'Your neighborhood store, delivered.'}</p></div>
        <div class="sb-deal">Save up to 20% on bakery this week</div>
      </section>
      ${rows.map(([id, list]) => `
        <section class="row" aria-labelledby="row-${id}">
          <div class="row-head"><h2 id="row-${id}" class="row-title">${esc(aisleName(id))}</h2><button class="link" data-act="aisle" data-id="${id}">View all (${list.length}) ›</button></div>
          <div class="row-scroll">${list.slice(0, 10).map((p) => card(p, s)).join('')}</div>
        </section>`).join('')}`);
  }

  function aislePage() {
    const s = store(st.storeId);
    if (!s) return home();
    const inAisle = storeProducts(s).filter((p) => p.aisle === st.aisleId);
    const subs = st.aisleId === 'bakery' ? BAKERY_SUBS.filter((b) => inAisle.some((p) => p.sub === b.id)) : [];
    const list = sortList(applyFilters(inAisle.filter((p) => !st.bakerySub || st.aisleId !== 'bakery' || p.sub === st.bakerySub), s), s);
    return storeShell(s, `
      <nav class="crumbs" aria-label="Breadcrumb"><button class="link" data-act="nav" data-page="store">${esc(s.name)}</button> › <span>${esc(aisleName(st.aisleId))}</span></nav>
      <div class="list-head"><h1>${esc(aisleName(st.aisleId))}</h1><span class="muted">${list.length} items</span>${sortSelect()}</div>
      ${subs.length ? `<div class="chips sub-chips" role="group" aria-label="Bakery categories"><button class="chip ${!st.bakerySub ? 'on' : ''}" aria-pressed="${!st.bakerySub}" data-act="bakery-sub" data-sub="">All</button>${subs.map((b) => `<button class="chip ${st.bakerySub === b.id ? 'on' : ''}" aria-pressed="${st.bakerySub === b.id}" data-act="bakery-sub" data-sub="${b.id}" data-guide="sub-${b.id}">${esc(b.name)}</button>`).join('')}</div>` : ''}
      ${filterBar()}
      ${list.length ? `<div class="pgrid">${list.map((p) => card(p, s)).join('')}</div>` : noneMatch()}`);
  }

  function searchPage() {
    const s = store(st.storeId);
    if (!s) {
      // Search across all stores, grouped by store.
      const groups = STORES.map((x) => [x, storeProducts(x).map((p) => [p, matches(p, st.query)]).filter(([, sc]) => sc > 0).sort((a, b) => b[1] - a[1]).map(([p]) => p)]).filter(([, l]) => l.length);
      return `<div class="list-head"><h1>Results for “${esc(st.query)}”</h1></div>
        ${groups.length ? groups.map(([x, l]) => `
          <section class="row"><div class="row-head"><button class="store-link" data-act="store" data-id="${x.id}">${storeLogo(x, 36)} <span><strong>${esc(x.name)}</strong><br><small>${esc(x.eta)}</small></span></button><button class="link" data-act="store-search" data-id="${x.id}">See all in ${esc(x.short)} ›</button></div>
          <div class="row-scroll">${l.slice(0, 8).map((p) => card(p, x)).join('')}</div></section>`).join('')
        : `<p class="empty">No results. Try a simpler word, like “cake” or “bananas”.</p>`}`;
    }
    const scored = storeProducts(s).map((p) => [p, matches(p, st.query)]);
    const allHits = scored.filter(([, sc]) => sc > 0).sort((a, b) => b[1] - a[1]).map(([p]) => p);
    const hits = sortList(applyFilters(allHits, s), s);
    // A few related items so results never look empty.
    const words = st.query.toLowerCase().split(/\s+/).filter(Boolean);
    const related = storeProducts(s).filter((p) => !hits.includes(p) && words.some((w) => matches(p, w) > 0)).slice(0, 10);
    return storeShell(s, `
      <div class="list-head"><h1>Results for “${esc(st.query)}”</h1><span class="muted">${hits.length} item${hits.length === 1 ? '' : 's'} at ${esc(s.name)}</span>${sortSelect()}</div>
      ${allHits.length ? filterBar() : ''}
      ${hits.length ? `<div class="pgrid">${hits.map((p) => card(p, s)).join('')}</div>` : allHits.length ? noneMatch() : `<p class="empty">No exact matches at ${esc(s.name)}.</p>`}
      ${related.length ? `<h2 class="row-title">Related items</h2><div class="row-scroll">${related.map((p) => card(p, s)).join('')}</div>` : ''}`);
  }

  function buyAgain() {
    const s = store(st.storeId);
    if (!s) return ordersPage();
    const ids = [...new Set(orders.flatMap((o) => o.lines.filter((l) => l.storeId === s.id).map((l) => l.id)))];
    return storeShell(s, `<div class="list-head"><h1>Buy it again</h1></div>${ids.length
      ? `<div class="pgrid">${ids.map((id) => card(product(id), s)).join('')}</div>`
      : `<div class="empty-card">🧺<p>Items you've ordered from ${esc(s.name)} will show up here.</p><button class="secondary" data-act="nav" data-page="store">Browse the store</button></div>`}`);
  }

  function wrapPage(inner) { const s = store(st.storeId); return s ? storeShell(s, inner) : `<div class="plain-page">${inner}</div>`; }

  function ordersPage() {
    return wrapPage(`<div class="list-head"><h1>Your orders</h1></div>${orders.length
      ? orders.slice().reverse().map((o) => `<section class="order-card"><div class="oc-head"><strong>Order #${esc(o.no)}</strong><span class="muted">${esc(o.when)} · ${money(o.total)}</span><span class="oc-status">Received</span></div>
          <div class="co-items">${o.lines.map((l) => { const p = product(l.id); return `<div class="co-item"><div class="dr-img">${img(p)}</div><div><div>${esc(p.name)}${l.qty > 1 ? ` × ${l.qty}` : ''}</div><small class="muted">${esc([l.size, l.message ? `“${l.message}”` : null].filter(Boolean).join(' · '))}</small></div><div>${money(l.price * l.qty)}</div></div>`; }).join('')}</div></section>`).join('')
      : `<div class="empty-card">🧾<p>You haven't placed any orders in this session.</p><button class="secondary" data-act="home">Shop stores</button></div>`}`);
  }

  function listsPage() {
    const s = store(st.storeId) || store('greenway');
    const items = [...favs].map(product).filter(Boolean);
    return wrapPage(`<div class="list-head"><h1>Your lists</h1><span class="muted">Favorites</span></div>${items.length
      ? `<div class="pgrid">${items.map((p) => card(p, carries(s, p) ? s : STORES.find((x) => carries(x, p)))).join('')}</div>`
      : `<div class="empty-card">♡<p>Tap the heart on any item to save it here.</p></div>`}`);
  }

  function helpPage() {
    const qa = [
      ['How do I find a cake without nuts?', 'Search for “cake”, then use the <strong>Nut-free</strong> filter above the results. Always open the item and read its <strong>Allergens</strong> section too.'],
      ['How do I add a message to a cake?', 'Open the cake, pick a size, and type your message in “Message on the cake” before adding it to the cart.'],
      ['When will my order arrive?', 'You choose a delivery day and time at checkout.'],
      ['Which card can I use?', 'This is a demo shop. It only accepts the printed <strong>test card</strong> handed out in the study. Never type a real card.'],
    ];
    return wrapPage(`<div class="list-head"><h1>Help center</h1></div><div class="help-list">${qa.map(([q, a]) => `<details class="help-q"><summary>${esc(q)}</summary><p>${a}</p></details>`).join('')}</div>`);
  }

  function pricingModal() {
    const s = store(st.storeId);
    return `<div class="overlay" data-act="close-pricing"></div><div class="modal small-modal" role="dialog" aria-modal="true" aria-labelledby="pp-title"><button class="modal-x" data-act="close-pricing" aria-label="Close">✕</button><div class="modal-body"><h1 id="pp-title">Pricing policy</h1><p>${s ? esc(s.name) : 'This store'} sets the prices shown on Basketly. ${s && s.bulk ? 'Prices are the same as in the warehouse.' : 'Prices may be higher than in the store.'}</p><p class="muted">All prices in this demo are invented.</p><button class="primary" data-act="close-pricing">Got it</button></div></div>`;
  }

  // ── Filters ──
  function applyFilters(list, s) {
    const f = st.filters;
    return list.filter((p) => (!f.nutFree || !hasNuts(p)) && (!f.glutenFree || glutenFree(p)) && (!f.under20 || offer(s, p).price < 20));
  }
  function filterBar() {
    const f = st.filters;
    const chip = (k, label, guide) => `<button class="chip filter ${f[k] ? 'on' : ''}" aria-pressed="${f[k]}" data-act="filter" data-filter="${k}" data-guide="${guide}">${f[k] ? '✓ ' : ''}${label}</button>`;
    return `<div class="chips filter-bar" role="group" aria-label="Filters"><span class="muted small">Filter:</span>${chip('nutFree', 'Nut-free', 'filter-nut-free')}${chip('glutenFree', 'Gluten-free', 'filter-gluten-free')}${chip('under20', 'Under $20', 'filter-under-20')}${Object.values(f).some(Boolean) ? '<button class="link small" data-act="clear-filters">Clear filters</button>' : ''}</div>`;
  }
  function noneMatch() { return `<div class="empty-card">🔎<p>No items match these filters.</p><button class="secondary" data-act="clear-filters">Clear filters</button></div>`; }
  const stars = (r) => '★★★★★'.slice(0, Math.round(r)) + '☆☆☆☆☆'.slice(0, 5 - Math.round(r));

  function deals() {
    const s = store(st.storeId);
    const list = storeProducts(s).filter((p, i) => i % 3 === 0);
    return storeShell(s, `<div class="list-head"><h1>Deals</h1><span class="muted">Prices shown include the deal</span></div><div class="pgrid">${list.map((p) => card(p, s, true)).join('')}</div>`);
  }

  function sortSelect() {
    return `<label class="sort">Sort <select data-act="sort">${[['relevance', 'Best match'], ['low', 'Price: low to high'], ['high', 'Price: high to low'], ['name', 'Name']].map(([v, l]) => `<option value="${v}" ${st.sort === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>`;
  }
  function sortList(list, s) {
    const pr = (p) => offer(s, p).price;
    if (st.sort === 'low') return [...list].sort((a, b) => pr(a) - pr(b));
    if (st.sort === 'high') return [...list].sort((a, b) => pr(b) - pr(a));
    if (st.sort === 'name') return [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }

  function card(p, s, deal = false) {
    const o = offer(s, p);
    const line = st.cart.find((l) => l.id === p.id && !l.size && l.storeId === s.id);
    const was = deal ? o.price : null;
    const price = deal ? Math.max(0.5, Math.round(o.price * 80) / 100) : o.price;
    const add = p.options
      ? `<button class="qadd" data-act="open" data-id="${p.id}" data-store="${s.id}" aria-label="Choose options for ${esc(p.name)}">＋ Add</button>`
      : line
        ? `<div class="qstep" role="group" aria-label="${esc(p.name)} quantity"><button data-act="dec" data-id="${p.id}" data-store="${s.id}" aria-label="Remove one">−</button><span>${line.qty}</span><button data-act="inc" data-id="${p.id}" data-store="${s.id}" aria-label="Add one">＋</button></div>`
        : `<button class="qadd" data-act="quick-add" data-id="${p.id}" data-store="${s.id}" aria-label="Add ${esc(p.name)} to cart">＋ Add</button>`;
    return `
      <article class="pcard" data-guide="product-${p.id}">
        <button class="pcard-hit" data-act="open" data-id="${p.id}" data-store="${s.id}" aria-label="${esc(p.brand ? p.brand + ' ' : '')}${esc(p.name)}, ${money(price)}, ${esc(o.size)}">
          <div class="pimg">${img(p)}</div>
          <div class="pprice ${deal ? 'deal' : ''}">${priceHtml(price)}${p.unit ? `<span class="per"> ${esc(p.unit)}</span>` : ''}${was ? ` <s>${money(was)}</s>` : ''}</div>
          <div class="pname">${p.brand && !/^(Bakery Fresh|Floral)$/.test(p.brand) ? `<span class="pbrand">${esc(p.brand)}</span> ` : ''}${esc(p.name)}</div>
          <div class="psize">${esc(o.size)}</div>
          ${p.rating ? `<div class="prate" aria-hidden="true"><span>${stars(p.rating)}</span> ${p.rating.toFixed(1)} (${p.reviews.toLocaleString()})</div>` : ''}
          ${p.badge ? `<div class="pbadge">${esc(p.badge)}</div>` : '<div class="pstock">Many in stock</div>'}
        </button>
        <button class="fav ${favs.has(p.id) ? 'on' : ''}" data-act="fav" data-id="${p.id}" aria-pressed="${favs.has(p.id)}" aria-label="Save ${esc(p.name)} to your list">${favs.has(p.id) ? '♥' : '♡'}</button>
        <div class="padd">${add}</div>
      </article>`;
  }

  function productModal() {
    const p = product(st.productId);
    const s = store(st.storeId) || store('greenway');
    const o = offer(s, p);
    const sizeOpt = p.options && p.options.sizes.find((x) => x.id === st.size);
    const price = sizeOpt ? sizeOpt.price : (p.options ? p.options.sizes[0].price : o.price);
    const related = storeProducts(s).filter((x) => x.id !== p.id && (x.aisle === p.aisle || x.aisle === 'flowers' || x.aisle === 'candy')).slice(0, 6);
    return `
      <div class="overlay" data-act="close-modal"></div>
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="pm-title">
        <button class="modal-x" data-act="close-modal" aria-label="Close">✕</button>
        <div class="modal-body">
          <div class="pm-top">
            <div class="pm-gallery"><div class="pm-main">${img(p, 'pm-img')}</div>
              ${p.img2 ? `<div class="pm-thumbs"><div class="pm-thumb on">${img(p)}</div><div class="pm-thumb">${img(p, '', 'img2')}</div></div>` : ''}</div>
            <div class="pm-info">
              ${p.brand ? `<button class="link brand-link" data-act="store-search" data-id="${s.id}" data-q="${esc(p.brand)}">${esc(p.brand)}</button>` : ''}
              <h1 id="pm-title">${esc(p.name)}</h1>
              <div class="pm-size">${esc(sizeOpt ? `${sizeOpt.label}, ${sizeOpt.note}` : o.size)}</div>
              <button class="pm-rating link" data-act="section" data-sec="reviews" aria-label="Rated ${(p.rating || 4.5).toFixed(1)} out of 5, ${(p.reviews || 120).toLocaleString()} reviews. Show reviews">${stars(p.rating || 4.5)} <span>${(p.rating || 4.5).toFixed(1)} (${(p.reviews || 120).toLocaleString()})</span></button>
              <div class="pm-tools"><button class="link small" data-act="fav" data-id="${p.id}" aria-pressed="${favs.has(p.id)}">${favs.has(p.id) ? '♥ Saved' : '♡ Save'}</button><button class="link small" data-act="section" data-sec="allergens">Allergens</button><button class="link small" data-act="share">Share</button></div>
              <div class="pm-stock">● Many in stock</div>
              <div class="pm-price">${priceHtml(price)}${p.unit ? `<span class="per"> ${esc(p.unit)}</span>` : ''}</div>
              ${p.options ? `
                <fieldset class="opt" data-guide="size"><legend>Choose a size <span class="req">Required</span></legend>
                  ${p.options.sizes.map((z) => `<button type="button" class="opt-pill ${st.size === z.id ? 'on' : ''}" aria-pressed="${st.size === z.id}" data-act="size" data-size="${z.id}"><strong>${esc(z.label)}</strong><span>${esc(z.note)}</span><span>${money(z.price)}</span></button>`).join('')}
                  ${st.sizeError ? '<p class="field-error" role="alert">Please choose a size first.</p>' : ''}
                </fieldset>
                <div class="opt" data-guide="message"><label for="bk-msg"><strong>${esc(p.options.message.label)}</strong> <span class="muted">Optional · up to ${p.options.message.max} characters</span></label>
                  <input id="bk-msg" maxlength="${p.options.message.max}" autocomplete="off" placeholder="e.g. Happy Birthday, Maya!"></div>` : ''}
              <div class="pm-buy">
                <label class="qty">Qty <select data-act="qty">${[1, 2, 3, 4, 5].map((n) => `<option ${st.qty === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
                ${st.justAdded
                  ? `<div class="added" role="status">✓ Added to cart</div>`
                  : `<button class="primary big" data-act="add" data-guide="add-to-cart">Add to cart</button>`}
              </div>
              ${st.justAdded ? `<div class="pm-after"><button class="primary" data-act="view-cart" data-guide="view-cart">View cart (${cartCount()})</button><button class="secondary" data-act="close-modal">Continue shopping</button></div>` : ''}
              <p class="pm-note">Sold by ${esc(s.name)} · ${esc(s.eta)}</p>
            </div>
          </div>
          <div class="pm-details">
            ${section('details', 'Details', `<p>${esc(p.details || `${p.name}, ${o.size}. Product details are provided by the store for this demo.`)}</p>${p.directions ? `<p><strong>Storage:</strong> ${esc(p.directions)}</p>` : ''}`)}
            ${p.ingredients || p.contains ? section('ingredients', 'Ingredients', `<p>${esc(p.ingredients || 'See the package for the full ingredient list.')}</p>`) : ''}
            ${section('allergens', 'Allergens', `<p class="allergen-box ${hasNuts(p) ? 'warn' : 'ok'}">${hasNuts(p) ? '⚠️' : '✓'} ${esc(allergenText(p))}</p>`)}
            ${section('reviews', `Reviews (${(p.reviews || 120).toLocaleString()})`, reviewsHtml(p))}
            <p class="disclaimer">Photo: ${esc(p.img.credit.author)}, ${esc(p.img.credit.license)}, via ${esc(p.img.credit.site)} (<a href="credits.html" target="_blank" rel="noopener">all credits</a>). Product photos and details are for illustration in this demo.</p>
          </div>
          ${related.length ? `<h2 class="row-title">Often bought together</h2><div class="row-scroll small">${related.map((x) => card(x, s)).join('')}</div>` : ''}
        </div>
      </div>`;
  }

  function section(id, title, body) {
    const open = !!st.opened[id];
    return `<div class="pm-sec ${open ? 'open' : ''}" data-guide="${id}"><button class="pm-sec-head" data-act="section" data-sec="${id}" aria-expanded="${open}"><span>${esc(title)}</span><span aria-hidden="true">${open ? '−' : '+'}</span></button>${open ? `<div class="pm-sec-body">${body}</div>` : ''}</div>`;
  }
  function reviewsHtml(p) {
    const pool = [
      ['Carol M.', 5, 'Fresh and lovely. The message was written neatly.'],
      ['Dev R.', 4, 'Good value for the size. A bit sweet for me.'],
      ['Joan T.', 5, 'Arrived on time and looked just like the photo.'],
      ['Sam K.', 4, 'Everyone enjoyed it. Would order again.'],
      ['Lena P.', 3, 'Tasty, but the box was slightly dented.'],
    ];
    const k = [...p.id].reduce((n, c) => n + c.charCodeAt(0), 0);
    const picks = [0, 1, 2].map((i) => pool[(k + i * 2) % pool.length]);
    return `<p class="muted small">Sample reviews written for this demo.</p>${picks.map(([who, r, t]) => `<div class="review"><div><strong>${esc(who)}</strong> <span class="stars" aria-label="${r} out of 5">${stars(r)}</span></div><p>${esc(t)}</p></div>`).join('')}`;
  }

  function cartDrawer() {
    const groups = STORES.map((s) => [s, st.cart.map((l, i) => [l, i]).filter(([l]) => l.storeId === s.id)]).filter(([, l]) => l.length);
    const subtotal = st.cart.reduce((n, l) => n + l.price * l.qty, 0);
    return `
      <div class="overlay" data-act="close-cart"></div>
      <aside class="drawer" role="dialog" aria-modal="true" aria-label="Your cart">
        <div class="dr-head"><h2>Personal cart</h2><span class="muted">Shopping in ${DEMO_ADDRESS}</span><button class="modal-x" data-act="close-cart" aria-label="Close cart">✕</button></div>
        <div class="dr-body">
          ${groups.length ? groups.map(([s, lines]) => `
            <section class="dr-store"><div class="dr-store-head">${storeLogo(s, 36)}<div><strong>${esc(s.name)}</strong><br><small>${esc(s.eta)}</small></div></div>
              ${lines.map(([l, i]) => { const p = product(l.id); return `
                <div class="dr-line"><div class="dr-img">${img(p)}</div>
                  <div class="dr-info"><div class="dr-name">${esc(p.name)}</div>
                    <div class="dr-meta">${esc([l.size, l.message ? `Message: “${l.message}”` : null].filter(Boolean).join(' · '))}</div>
                    <div class="dr-actions"><div class="qstep" role="group" aria-label="Quantity"><button data-act="line-dec" data-ix="${i}" aria-label="Remove one">−</button><span>${l.qty}</span><button data-act="line-inc" data-ix="${i}" aria-label="Add one">＋</button></div><button class="link small" data-act="line-remove" data-ix="${i}">Remove</button></div></div>
                  <div class="dr-price">${money(l.price * l.qty)}</div></div>`; }).join('')}
            </section>`).join('')
          : `<div class="empty-card">🛒<p>Your cart is empty.</p><button class="secondary" data-act="close-cart">Start shopping</button></div>`}
        </div>
        ${groups.length ? `<div class="dr-foot"><button class="primary big checkout-btn" data-act="checkout" data-guide="checkout"><span>Go to checkout</span><span class="pill">${money(subtotal)}</span></button></div>` : ''}
      </aside>`;
  }

  function totals() {
    const sub = st.cart.reduce((n, l) => n + l.price * l.qty, 0);
    const fee = st.slot ? (SLOTS.find(([t]) => t === st.slot) || [0, 3.99])[1] : 3.99;
    const service = Math.round(sub * 0.05 * 100) / 100;
    const tip = Math.round(sub * (st.tip / 100) * 100) / 100;
    return { sub, fee, service, tip, total: sub + fee + service + tip };
  }

  function checkout() {
    const t = totals();
    const ds = days();
    return `
      <div class="co-layout">
        <div class="co-main">
          <h1>Checkout</h1>
          <section class="co-sec" data-guide="address"><h2><span class="num">1</span> Delivery address</h2>
            <div class="grid2">
              <label class="span2">Street address <input name="street" data-addr autocomplete="off" data-private></label>
              <label>Apt, suite (optional) <input name="apt" autocomplete="off" data-private-opt></label>
              <label>City <input name="city" data-addr autocomplete="off" data-private></label>
              <label>State <input name="state" autocomplete="off" maxlength="2" data-private-opt></label>
              <label>ZIP code <input name="zip" data-addr inputmode="numeric" autocomplete="off" data-private></label>
              <label class="span2">Delivery instructions (optional) <textarea name="notes" rows="2" placeholder="e.g. Leave at the front door" data-private-opt></textarea></label>
            </div>
            <label class="check"><input type="checkbox" data-act="gift" ${st.gift ? 'checked' : ''}> This order is a gift</label>
            ${st.gift ? `<div class="grid2 gift"><label>Recipient's name <input name="gname" autocomplete="off" data-private-opt></label><label class="span2">Gift message (optional) <textarea name="gmsg" rows="2" data-private-opt></textarea></label></div>` : ''}
          </section>
          <section class="co-sec" data-guide="delivery-day"><h2><span class="num">2</span> Delivery time</h2>
            <div class="day-tabs" role="group" aria-label="Day">${ds.map((d) => `<button class="day ${st.day === d.id ? 'on' : ''}" aria-pressed="${st.day === d.id}" data-act="day" data-day="${d.id}"><strong>${esc(d.label)}</strong><span>${esc(d.date)}</span></button>`).join('')}</div>
            ${st.day ? `<div class="slots" role="group" aria-label="Time">${SLOTS.map(([tm, fee]) => `<button class="slot ${st.slot === tm ? 'on' : ''}" aria-pressed="${st.slot === tm}" data-act="slot" data-slot="${tm}"><span>${tm}</span><span>${money(fee)}</span></button>`).join('')}</div>` : '<p class="muted">Choose a day to see delivery times.</p>'}
          </section>
          <section class="co-sec"><h2><span class="num">3</span> Mobile number</h2>
            <label>Phone (optional, for delivery updates) <input name="phone" inputmode="tel" autocomplete="off" data-private-opt></label></section>
          <section class="co-sec" data-guide="payment"><h2><span class="num">4</span> Payment</h2>
            <div class="demo-pay">💳 Demo shop: use the printed <strong>test card</strong> you were given. Never type a real card here. Nothing is charged.</div>
            <div class="grid2 card-form">
              <label class="span2">Name on card <input name="ccname" autocomplete="off" spellcheck="false" data-private data-card></label>
              <label class="span2">Card number <input name="ccnum" inputmode="numeric" autocomplete="off" maxlength="19" placeholder="1234 5678 9012 3456" data-private data-card></label>
              <label>Expiry (MM/YY) <input name="ccexp" inputmode="numeric" autocomplete="off" maxlength="5" placeholder="MM/YY" data-private data-card></label>
              <label>Security code (CVC) <input name="cccvc" inputmode="numeric" autocomplete="off" maxlength="4" placeholder="123" data-private data-card></label>
            </div>
            <div class="card-status" aria-live="polite">${cardStatus()}</div>
          </section>
        </div>
        <aside class="co-side" data-guide="summary">
          <div data-commit><button class="primary big" data-act="place" data-guide="place-order">Place order</button></div>
          ${st.placeError ? `<p class="field-error" role="alert">${esc(st.placeError)}</p>` : ''}
          <p class="fine">By placing your order, you agree to the demo's pretend terms. You'll review nothing real; nothing is charged.</p>
          <div class="co-items">${st.cart.map((l) => { const p = product(l.id); return `<div class="co-item"><div class="dr-img">${img(p)}</div><div><div>${esc(p.name)}${l.qty > 1 ? ` × ${l.qty}` : ''}</div><small class="muted">${esc([l.size, l.message ? `“${l.message}”` : null].filter(Boolean).join(' · '))}</small></div><div>${money(l.price * l.qty)}</div></div>`; }).join('')}</div>
          <div class="trow"><span>Item subtotal</span><span>${money(t.sub)}</span></div>
          <div class="trow"><span>Delivery fee${st.slot ? ` (${esc(st.day)} ${esc(st.slot)})` : ''}</span><span>${money(t.fee)}</span></div>
          <div class="trow"><span>Service fee</span><span>${money(t.service)}</span></div>
          <div class="trow tipr"><span>Shopper tip</span><span>${money(t.tip)}</span></div>
          <div class="tips" role="group" aria-label="Tip">${TIPS.map((x) => `<button class="chip ${st.tip === x ? 'on' : ''}" aria-pressed="${st.tip === x}" data-act="tip" data-tip="${x}">${x ? x + '%' : 'None'}</button>`).join('')}</div>
          <div class="trow total"><span>Total</span><strong>${money(t.total)}</strong></div>
        </aside>
      </div>`;
  }

  function cardStatus() {
    if (st.cardValid) return '<p class="ok-note">✓ Test card accepted</p>';
    const errs = Object.values(st.cardErrors).filter(Boolean);
    return errs.length ? errs.map((e) => `<p class="field-error">${esc(e)}</p>`).join('') : '';
  }

  function confirmation() {
    const o = st.lastOrder || {};
    return `
      <div class="confirm">
        <div class="ok-badge" aria-hidden="true">✓</div>
        <h1>Thanks! Your order is placed</h1>
        <p>Order #${esc(st.orderNo || '')} · Arriving ${esc(o.when || 'soon')}</p>
        <ol class="track"><li class="on">Order received</li><li>Shopper assigned</li><li>On the way</li><li>Delivered</li></ol>
        <div class="co-items narrow">${(o.lines || []).map((l) => { const p = product(l.id); return `<div class="co-item"><div class="dr-img">${img(p)}</div><div><div>${esc(p.name)}</div><small class="muted">${esc([l.size, l.message ? `“${l.message}”` : null].filter(Boolean).join(' · '))}</small></div><div>${money(l.price * l.qty)}</div></div>`; }).join('')}</div>
        <p class="muted">This is a demo, so nothing was really ordered and nothing was charged.</p>
        <button class="secondary" data-act="home">Back to Basketly</button>
      </div>`;
  }

  // ── Cart helpers ──
  function addLine(p, s, { size = null, message = '', qty = 1 } = {}) {
    const unitPrice = size && p.options ? p.options.sizes.find((z) => z.id === size).price : offer(s, p).price;
    const sizeLabel = size || offer(s, p).size;
    const same = st.cart.find((l) => l.id === p.id && l.storeId === s.id && (l.size || null) === (size ? sizeLabel : null) && (l.message || '') === message);
    if (same) same.qty += qty;
    else st.cart.push({ id: p.id, storeId: s.id, qty, price: unitPrice, size: size ? sizeLabel : null, sizeText: sizeLabel, message: message || null });
  }

  // ── Events: only the PERSON's actions reach here. ──
  root.addEventListener('submit', (e) => {
    if (e.target.matches('.bk-search')) {
      e.preventDefault();
      const q = e.target.querySelector('input').value.trim();
      if (!q) return;
      const inStore = st.storeId && st.page !== 'home';
      go('search', { query: q, storeId: inStore ? st.storeId : null, sort: 'relevance', productId: null, cartOpen: false });
    }
  });

  root.addEventListener('change', (e) => {
    const a = e.target.dataset.act;
    if (a === 'sort') { st.sort = e.target.value; renderMain(); return emit(); }
    if (a === 'qty') { st.qty = Number(e.target.value) || 1; return; }
    if (a === 'gift') { st.gift = e.target.checked; keepCheckout(() => renderMain()); return emit(); }
  });

  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || !root.contains(b) || b.tagName === 'SELECT' || (b.tagName === 'INPUT' && b.type === 'checkbox')) return;
    const a = b.dataset.act;
    const id = b.dataset.id;
    switch (a) {
      case 'home': return go('home', { storeId: null, query: '', productId: null, cartOpen: false });
      case 'menu': st.menuOpen = !st.menuOpen; return renderHeader();
      case 'menu-item': case 'pickup': return toast('That part of Basketly isn\'t available in this demo.');
      case 'share': return toast('Link copied (demo).');
      case 'address': st.addrOpen = !st.addrOpen; st.menuOpen = false; return renderHeader();
      case 'pricing': st.pricingOpen = true; return renderModal();
      case 'close-pricing': st.pricingOpen = false; return renderModal();
      case 'page': return go(b.dataset.page, { productId: null, cartOpen: false });
      case 'fav': { if (favs.has(id)) favs.delete(id); else favs.add(id); toast(favs.has(id) ? 'Saved to Your lists' : 'Removed from Your lists'); refreshCards(); return emit(); }
      case 'filter': { const k = b.dataset.filter; st.filters = { ...st.filters, [k]: !st.filters[k] }; refreshCards(); return emit(); }
      case 'clear-filters': st.filters = { nutFree: false, glutenFree: false, under20: false }; refreshCards(); return emit();
      case 'bakery-sub': st.bakerySub = b.dataset.sub || null; refreshCards(); return emit();
      case 'section': { const k = b.dataset.sec; st.opened = { ...st.opened, [k]: !st.opened[k] }; if (st.opened[k]) st.seen = { ...(st.seen || {}), [k]: true }; rerenderModalKeep(); const el = $modal.querySelector(`[data-guide="${k}"]`); if (el && st.opened[k]) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); return emit(); }
      case 'kind': st.kind = b.dataset.kind; renderMain(); return emit();
      case 'store': return go('store', { storeId: id, aisleId: null, query: '', productId: null, cartOpen: false });
      case 'store-search': return go('search', { storeId: id, query: b.dataset.q || st.query, productId: null, cartOpen: false });
      case 'nav': return go(b.dataset.page, { aisleId: null });
      case 'aisle': return go('aisle', { aisleId: id, sort: 'relevance', bakerySub: null });
      case 'open': {
        if (b.dataset.store) st.storeId = b.dataset.store;
        Object.assign(st, { productId: id, size: null, message: '', qty: 1, sizeError: false, justAdded: false, cartOpen: false, opened: {} });
        renderAll(); focusModal(); return emit();
      }
      case 'close-modal': st.productId = null; st.justAdded = false; renderAll(); return emit();
      case 'size': st.size = b.dataset.size; st.sizeError = false; rerenderModalKeep(); return emit();
      case 'add': {
        const p = product(st.productId); const s = store(st.storeId) || store('greenway');
        if (p.options && !st.size) { st.sizeError = true; rerenderModalKeep(); return emit(); }
        const msgEl = $modal.querySelector('#bk-msg');
        if (msgEl) st.message = msgEl.value.trim();
        addLine(p, s, { size: st.size, message: st.message, qty: st.qty });
        st.justAdded = true; renderHeader(); rerenderModalKeep(); return emit();
      }
      case 'quick-add': { addLine(product(id), store(b.dataset.store)); renderHeader(); refreshCards(); return emit(); }
      case 'inc': case 'dec': {
        const l = st.cart.find((x) => x.id === id && x.storeId === b.dataset.store && !x.size);
        if (l) { l.qty += a === 'inc' ? 1 : -1; if (l.qty <= 0) st.cart.splice(st.cart.indexOf(l), 1); }
        renderHeader(); refreshCards(); return emit();
      }
      case 'cart': case 'view-cart': Object.assign(st, { cartOpen: true, productId: null, justAdded: false, menuOpen: false }); renderAll(); focusDrawer(); return emit();
      case 'close-cart': st.cartOpen = false; renderAll(); return emit();
      case 'line-inc': case 'line-dec': case 'line-remove': {
        const l = st.cart[Number(b.dataset.ix)];
        if (l) { if (a === 'line-remove') l.qty = 0; else l.qty += a === 'line-inc' ? 1 : -1; if (l.qty <= 0) st.cart.splice(Number(b.dataset.ix), 1); }
        renderHeader(); renderDrawer(); refreshCards(); return emit();
      }
      case 'checkout': return go('checkout', { cartOpen: false, productId: null, placeError: '', addressFilled: false, cardValid: false, cardErrors: {} });
      case 'back-to-store': return go(st.storeId ? 'store' : 'home');
      case 'day': st.day = b.dataset.day; st.slot = null; keepCheckout(() => renderMain()); return emit();
      case 'slot': st.slot = b.dataset.slot; keepCheckout(() => renderMain()); return emit();
      case 'tip': st.tip = Number(b.dataset.tip); keepCheckout(() => renderMain()); return emit();
      case 'place': {
        const missing = [!st.addressFilled && 'your delivery address', !st.slot && 'a delivery time', !st.cardValid && 'the test card details'].filter(Boolean);
        if (missing.length) { st.placeError = `Please add ${missing.length > 1 ? missing.slice(0, -1).join(', ') + ' and ' + missing[missing.length - 1] : missing[0]}.`; keepCheckout(() => renderMain()); return emit(); }
        st.lastOrder = { lines: st.cart.map((l) => ({ ...l })), when: `${st.day} ${st.slot}` };
        st.orderNo = String(Math.floor(100000 + Math.random() * 899999));
        orders.push({ no: st.orderNo, when: st.lastOrder.when, lines: st.lastOrder.lines, total: totals().total });
        return go('confirmation', { cart: [], addressFilled: false, day: null, slot: null, gift: false, placeError: '', cardValid: false, cardErrors: {} });
      }
      default: return undefined;
    }
  });

  root.addEventListener('input', (e) => {
    if (e.target.id === 'bk-msg') {
      const was = !!st.message.trim();
      st.message = e.target.value;
      if (was !== !!st.message.trim()) emit();
    } else if (e.target.matches('[data-card]')) {
      onCardInput(e.target);
    } else if (e.target.matches('[data-addr]')) {
      const all = [...root.querySelectorAll('[data-addr]')].every((i) => i.value.trim());
      if (all !== st.addressFilled) { st.addressFilled = all; emit(); }
    }
  });

  doc.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (st.pricingOpen) { st.pricingOpen = false; renderModal(); }
    else if (st.addrOpen) { st.addrOpen = false; renderHeader(); }
    else if (st.productId) { st.productId = null; st.justAdded = false; renderAll(); emit(); }
    else if (st.cartOpen) { st.cartOpen = false; renderAll(); emit(); }
  });

  // Card fields: formatted as typed and checked against the printed test card.
  // The values stay in the inputs only; the state keeps a yes/no and the
  // wording of any problem, never the digits.
  function onCardInput(el) {
    if (el.name === 'ccnum') { const pos = el.value.length; el.value = formatCardNumber(el.value); if (pos === el.value.length) el.setSelectionRange(pos, pos); }
    if (el.name === 'ccexp') { const d = el.value.replace(/\D/g, '').slice(0, 4); el.value = d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d; }
    if (el.name === 'cccvc') el.value = el.value.replace(/\D/g, '').slice(0, 4);
    const get = (n) => (root.querySelector(`[name="${n}"]`) || {}).value || '';
    const r = checkCard({ name: get('ccname'), number: get('ccnum'), expiry: get('ccexp'), cvc: get('cccvc') });
    const changed = r.valid !== st.cardValid || JSON.stringify(r.errors) !== JSON.stringify(st.cardErrors);
    st.cardValid = r.valid; st.cardErrors = r.errors;
    if (r.valid) st.placeError = '';
    const box = root.querySelector('.card-status'); if (box) box.innerHTML = cardStatus();
    if (changed) emit();
  }

  // A photo that can't load (offline, or the source moved) becomes a neutral
  // placeholder tile instead of a broken image.
  root.addEventListener('error', (e) => {
    const im = e.target;
    if (!im || im.tagName !== 'IMG' || !im.dataset.ph) return;
    const ph = doc.createElement('div');
    ph.className = `ph ${im.className}`.trim();
    ph.setAttribute('aria-hidden', 'true');
    ph.textContent = im.dataset.ph;
    im.replaceWith(ph);
  }, true);

  // Re-render helpers that keep what the person typed.
  function rerenderModalKeep() {
    const msg = $modal.querySelector('#bk-msg');
    if (msg) st.message = msg.value;
    const scroll = $modal.querySelector('.modal-body');
    const top = scroll ? scroll.scrollTop : 0;
    renderModal();
    const s2 = $modal.querySelector('.modal-body'); if (s2) s2.scrollTop = top;
  }
  function keepCheckout(fn) {
    const vals = [...root.querySelectorAll('.co-main input[name], .co-main textarea[name]')].map((i) => [i.name, i.value]);
    const top = scroller.scrollTop;
    fn();
    for (const [n, v] of vals) { const i = root.querySelector(`.co-main [name="${n}"]`); if (i) i.value = v; }
    scroller.scrollTop = top;
  }
  function refreshCards() {
    const top = scroller.scrollTop;
    const rows = [...root.querySelectorAll('.row-scroll')].map((r) => r.scrollLeft);
    renderMain(); if (st.productId) rerenderModalKeep();
    scroller.scrollTop = top;
    [...root.querySelectorAll('.row-scroll')].forEach((r, i) => { r.scrollLeft = rows[i] || 0; });
  }
  function focusModal() { const m = $modal.querySelector('.modal'); if (m) { m.setAttribute('tabindex', '-1'); m.focus({ preventScroll: true }); } }
  function focusDrawer() { const d = $drawer.querySelector('.drawer'); if (d) { d.setAttribute('tabindex', '-1'); d.focus({ preventScroll: true }); } }

  let toastTimer = 0;
  function toast(text) {
    let t = doc.querySelector('.bk-toast');
    if (!t) { t = doc.createElement('div'); t.className = 'bk-toast'; t.setAttribute('role', 'status'); root.append(t); }
    t.textContent = text; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
  }

  renderAll();
  return {
    get state() { return snapshot(); },
    emit,
    reset() { st = fresh(); renderAll(); emit(); },
    /** Put a shopping list (from Platewise) into the cart at Summit. Returns how many matched. */
    importList(items) {
      const s = store('summit');
      let n = 0;
      for (const it of items || []) {
        const p = it.basketly && product(it.basketly);
        if (!p) continue;
        addLine(p, s); n++;
      }
      Object.assign(st, { page: 'store', storeId: 'summit', cartOpen: true });
      renderAll();
      return n;
    },
  };
}

function logoSvg() {
  return `<svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true"><path d="M5 12h22l-2.4 13.2A3 3 0 0 1 21.6 28H10.4a3 3 0 0 1-3-2.8Z" fill="#4f3bd9"/><path d="M10 12l4-7M22 12l-4-7" stroke="#4f3bd9" stroke-width="2.6" stroke-linecap="round"/><circle cx="16" cy="19" r="3" fill="#ffb547"/></svg>`;
}
