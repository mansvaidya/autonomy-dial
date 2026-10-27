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

import { STORES, AISLES, PRODUCTS, product, store, carries, offer, storeProducts, matches } from './catalog.js';

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
  });
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
      cartHasCake: st.cart.some((l) => l.id === 'choc-mousse-cake'),
      deliveryDay: st.slot ? `${st.day} ${st.slot}` : null, addressFilled: st.addressFilled,
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
        <button class="addr" data-act="address" aria-label="Delivery address: ${DEMO_ADDRESS}">📍 <span>${DEMO_ADDRESS}</span> ▾</button>
        <form class="bk-search" role="search" data-guide="search">
          <span aria-hidden="true">⌕</span>
          <label class="sr-only" for="bk-q">${inStore ? `Search ${esc(s.name)}` : 'Search products and stores'}</label>
          <input id="bk-q" type="search" autocomplete="off" placeholder="${inStore ? `Search ${esc(s.name)}…` : 'Search products and stores'}" value="${esc(st.query)}">
        </form>
        <button class="bk-cart ${n ? 'has' : ''}" data-act="cart" data-guide="cart" aria-label="Cart, ${n} item${n === 1 ? '' : 's'}">🛒 <span class="n">${n}</span></button>
      </header>
      ${st.menuOpen ? `<nav class="bk-menu" aria-label="Account"><div class="who">Hi, Guest</div>${['Your orders', 'Your lists', 'Credits & promos', 'Basketly+ membership', 'Help center', 'Account settings'].map((x) => `<button data-act="menu-item">${x}</button>`).join('')}</nav>` : ''}
      <div class="bk-demo" role="note">Basketly is a demo shop for a research study. Stores are fictional; nothing is bought and no payment is taken.</div>`;
  }

  function renderMain() {
    const fn = { home, store: storePage, aisle: aislePage, search: searchPage, checkout, confirmation, buyagain: buyAgain, deals }[st.page] || home;
    $main.innerHTML = fn();
  }

  function renderModal() {
    if (!st.productId) { $modal.innerHTML = ''; return; }
    $modal.innerHTML = productModal();
    const msg = $modal.querySelector('#bk-msg');
    if (msg) msg.value = st.message;
  }

  function renderDrawer() { $drawer.innerHTML = st.cartOpen ? cartDrawer() : ''; }

  function renderAll() { renderHeader(); renderMain(); renderModal(); renderDrawer(); scroller.classList.toggle('bk-locked', !!(st.productId || st.cartOpen)); }

  function go(page, extra = {}) {
    Object.assign(st, extra, { page, menuOpen: false });
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
    const nav = [['store', 'Storefront', '🏠'], ['buyagain', 'Buy it again', '↻'], ['deals', 'Deals', '🏷']];
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
    const list = sortList(storeProducts(s).filter((p) => p.aisle === st.aisleId), s);
    return storeShell(s, `
      <nav class="crumbs" aria-label="Breadcrumb"><button class="link" data-act="nav" data-page="store">${esc(s.name)}</button> › <span>${esc(aisleName(st.aisleId))}</span></nav>
      <div class="list-head"><h1>${esc(aisleName(st.aisleId))}</h1><span class="muted">${list.length} items</span>${sortSelect()}</div>
      <div class="pgrid">${list.map((p) => card(p, s)).join('')}</div>`);
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
    const hits = sortList(scored.filter(([, sc]) => sc > 0).sort((a, b) => b[1] - a[1]).map(([p]) => p), s);
    // A few related items so results never look empty.
    const words = st.query.toLowerCase().split(/\s+/).filter(Boolean);
    const related = storeProducts(s).filter((p) => !hits.includes(p) && words.some((w) => matches(p, w) > 0)).slice(0, 10);
    return storeShell(s, `
      <div class="list-head"><h1>Results for “${esc(st.query)}”</h1><span class="muted">${hits.length} item${hits.length === 1 ? '' : 's'} at ${esc(s.name)}</span>${sortSelect()}</div>
      ${hits.length ? `<div class="pgrid">${hits.map((p) => card(p, s)).join('')}</div>` : `<p class="empty">No exact matches at ${esc(s.name)}.</p>`}
      ${related.length ? `<h2 class="row-title">Related items</h2><div class="row-scroll">${related.map((p) => card(p, s)).join('')}</div>` : ''}`);
  }

  function buyAgain() {
    const s = store(st.storeId);
    return storeShell(s, `<div class="list-head"><h1>Buy it again</h1></div><div class="empty-card">🧺<p>Items you've ordered from ${esc(s.name)} will show up here.</p><button class="secondary" data-act="nav" data-page="store">Browse the store</button></div>`);
  }

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
          ${p.badge ? `<div class="pbadge">${esc(p.badge)}</div>` : '<div class="pstock">Many in stock</div>'}
        </button>
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
              <div class="pm-rating" aria-label="Rated 4.7 out of 5">★★★★★ <span>4.7 (1,284)</span></div>
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
            ${p.details ? `<details open><summary>Details</summary><p>${esc(p.details)}</p></details>` : `<details open><summary>Details</summary><p>${esc(p.name)}, ${esc(o.size)}. Product details are provided by the store for this demo.</p></details>`}
            ${p.ingredients ? `<details><summary>Ingredients</summary><p>${esc(p.ingredients)}</p></details>` : ''}
            ${p.directions ? `<details><summary>Directions</summary><p>${esc(p.directions)}</p></details>` : ''}
            ${p.allergens ? `<details><summary>Allergens</summary><p>${esc(p.allergens)}</p></details>` : ''}
            <p class="disclaimer">Photo: ${esc(p.img.credit.author)}, ${esc(p.img.credit.license)}, via ${esc(p.img.credit.site)} (<a href="credits.html" target="_blank" rel="noopener">all credits</a>). Product photos and details are for illustration in this demo.</p>
          </div>
          ${related.length ? `<h2 class="row-title">Often bought together</h2><div class="row-scroll small">${related.map((x) => card(x, s)).join('')}</div>` : ''}
        </div>
      </div>`;
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
              <label class="span2">Street address <input name="street" autocomplete="off" data-private></label>
              <label>Apt, suite (optional) <input name="apt" autocomplete="off" data-private-opt></label>
              <label>City <input name="city" autocomplete="off" data-private></label>
              <label>State <input name="state" autocomplete="off" maxlength="2" data-private-opt></label>
              <label>ZIP code <input name="zip" inputmode="numeric" autocomplete="off" data-private></label>
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
          <section class="co-sec"><h2><span class="num">4</span> Payment</h2>
            <div class="demo-pay">💳 No payment is needed: this is a demo shop. Never type real card details here.</div></section>
        </div>
        <aside class="co-side" data-guide="summary">
          <button class="primary big" data-act="place" data-guide="place-order">Place order</button>
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
      case 'menu-item': case 'pricing': case 'address': case 'pickup': return toast('That part of Basketly isn\'t available in this demo.');
      case 'kind': st.kind = b.dataset.kind; renderMain(); return emit();
      case 'store': return go('store', { storeId: id, aisleId: null, query: '', productId: null, cartOpen: false });
      case 'store-search': return go('search', { storeId: id, query: b.dataset.q || st.query, productId: null, cartOpen: false });
      case 'nav': return go(b.dataset.page, { aisleId: null });
      case 'aisle': return go('aisle', { aisleId: id, sort: 'relevance' });
      case 'open': {
        if (b.dataset.store) st.storeId = b.dataset.store;
        Object.assign(st, { productId: id, size: null, message: '', qty: 1, sizeError: false, justAdded: false, cartOpen: false });
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
      case 'checkout': return go('checkout', { cartOpen: false, productId: null, placeError: '' });
      case 'back-to-store': return go(st.storeId ? 'store' : 'home');
      case 'day': st.day = b.dataset.day; st.slot = null; keepCheckout(() => renderMain()); return emit();
      case 'slot': st.slot = b.dataset.slot; keepCheckout(() => renderMain()); return emit();
      case 'tip': st.tip = Number(b.dataset.tip); keepCheckout(() => renderMain()); return emit();
      case 'place': {
        const missing = [!st.addressFilled && 'your delivery address', !st.slot && 'a delivery time'].filter(Boolean);
        if (missing.length) { st.placeError = `Please add ${missing.join(' and ')}.`; keepCheckout(() => renderMain()); return emit(); }
        st.lastOrder = { lines: st.cart.map((l) => ({ ...l })), when: `${st.day} ${st.slot}` };
        st.orderNo = String(Math.floor(100000 + Math.random() * 899999));
        return go('confirmation', { cart: [], addressFilled: false, day: null, slot: null, gift: false, placeError: '' });
      }
      default: return undefined;
    }
  });

  root.addEventListener('input', (e) => {
    if (e.target.id === 'bk-msg') {
      const was = !!st.message.trim();
      st.message = e.target.value;
      if (was !== !!st.message.trim()) emit();
    } else if (e.target.matches('[data-private]')) {
      const all = [...root.querySelectorAll('[data-private]')].every((i) => i.value.trim());
      if (all !== st.addressFilled) { st.addressFilled = all; emit(); }
    }
  });

  doc.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (st.productId) { st.productId = null; st.justAdded = false; renderAll(); emit(); }
    else if (st.cartOpen) { st.cartOpen = false; renderAll(); emit(); }
  });

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
  };
}

function logoSvg() {
  return `<svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true"><path d="M5 12h22l-2.4 13.2A3 3 0 0 1 21.6 28H10.4a3 3 0 0 1-3-2.8Z" fill="#4f3bd9"/><path d="M10 12l4-7M22 12l-4-7" stroke="#4f3bd9" stroke-width="2.6" stroke-linecap="round"/><circle cx="16" cy="19" r="3" fill="#ffb547"/></svg>`;
}
