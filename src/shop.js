// shop.js — "Corner Market", a mock grocery shop for study sessions.
//
// A fictional store, not a copy of any real one. Nothing is bought, nothing
// leaves the page, and no payment is taken. It exists so the Teacher has a
// realistic task to guide: search, open a product, choose options, check out.
//
// The shop reports its state after every change through onChange(state). The
// state deliberately carries only FACTS the Teacher needs ("the address is
// filled in"), never what the person typed in private fields.
//
// Elements the Teacher may point at carry data-guide="…" attributes.

const PRODUCTS = [
  { id: 'chocolate-cake', name: 'Chocolate Celebration Cake', price: 22.38, unit: 'serves 8–12', art: 'cake-choc',
    blurb: 'Three layers of moist chocolate sponge with chocolate mousse filling and a rich ganache finish.',
    details: 'Baked fresh by our in-store bakery. Contains wheat, milk and eggs. Keep refrigerated and eat within 3 days.',
    sizes: ['7 inch', '10 inch'], custom: true },
  { id: 'vanilla-cake', name: 'Vanilla Bean Cake', price: 19.99, unit: 'serves 8–12', art: 'cake-van',
    blurb: 'Light vanilla sponge with buttercream frosting.', details: 'Contains wheat, milk and eggs.', sizes: ['7 inch', '10 inch'], custom: true },
  { id: 'strawberry-shortcake', name: 'Strawberry Shortcake', price: 17.49, unit: 'serves 6', art: 'cake-straw',
    blurb: 'Sponge cake with fresh strawberries and whipped cream.', details: 'Contains wheat, milk and eggs.' },
  { id: 'candles', name: 'Birthday Candles, 24 pack', price: 3.29, unit: '24 candles', art: 'candles',
    blurb: 'Assorted colours with holders.', details: 'Not edible.' },
  { id: 'bananas', name: 'Bananas', price: 0.29, unit: 'each', art: 'banana', blurb: 'Ripe and ready.', details: '' },
  { id: 'milk', name: 'Whole Milk', price: 3.89, unit: '1 gallon', art: 'milk', blurb: 'Fresh whole milk.', details: '' },
];

const DAYS = ['Thursday', 'Friday', 'Saturday'];
const WINDOWS = ['8–10 am', '10 am–12 pm', '2–4 pm'];

const money = (n) => `$${n.toFixed(2)}`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Simple flat illustrations, so there are no stock photos to license.
function art(kind, size = 120) {
  const s = size;
  const cake = (body, top, deco) => `
    <svg viewBox="0 0 120 120" width="${s}" height="${s}" aria-hidden="true">
      <ellipse cx="60" cy="98" rx="46" ry="8" fill="#e7e1d8"/>
      <rect x="20" y="52" width="80" height="44" rx="8" fill="${body}"/>
      <rect x="20" y="70" width="80" height="6" fill="${deco}" opacity=".55"/>
      <path d="M20 58 q10 10 20 0 q10 10 20 0 q10 10 20 0 q10 10 20 0 V52 H20Z" fill="${top}"/>
      <rect x="57" y="30" width="6" height="22" rx="2" fill="#f2c94c"/>
      <path d="M60 18 q6 8 0 12 q-6-4 0-12Z" fill="#f2994a"/>
    </svg>`;
  switch (kind) {
    case 'cake-choc': return cake('#7b4a2e', '#4e2c19', '#c8936a');
    case 'cake-van': return cake('#f3e3c3', '#fff7e6', '#e9b8a6');
    case 'cake-straw': return cake('#f7d6c9', '#fff', '#e05a6d');
    case 'candles': return `<svg viewBox="0 0 120 120" width="${s}" height="${s}" aria-hidden="true">${[0, 1, 2, 3, 4].map((i) => `<rect x="${24 + i * 16}" y="44" width="8" height="52" rx="2" fill="${['#e05a6d', '#2d9cdb', '#f2c94c', '#27ae60', '#9b51e0'][i]}"/><path d="M${28 + i * 16} 30 q5 7 0 11 q-5-4 0-11Z" fill="#f2994a"/>`).join('')}</svg>`;
    case 'banana': return `<svg viewBox="0 0 120 120" width="${s}" height="${s}" aria-hidden="true"><path d="M24 40 q10 50 72 44 q6-2 2-8 q-50 2-62-40Z" fill="#f2c94c"/><rect x="20" y="34" width="8" height="10" rx="2" fill="#6b5b2e"/></svg>`;
    case 'milk': return `<svg viewBox="0 0 120 120" width="${s}" height="${s}" aria-hidden="true"><rect x="38" y="36" width="44" height="64" rx="6" fill="#fff" stroke="#cfd8e3" stroke-width="3"/><rect x="48" y="20" width="24" height="18" rx="3" fill="#2d9cdb"/><rect x="38" y="62" width="44" height="14" fill="#2d9cdb" opacity=".25"/></svg>`;
    default: return '';
  }
}

/**
 * @param {HTMLElement} root  Where the shop renders.
 * @param {{onChange?:(state:object)=>void}} [opts]
 */
export function createShop(root, { onChange = () => {} } = {}) {
  const st = {
    view: 'home', query: '', productId: null,
    size: null, messageFilled: false, sizeError: false,
    cart: [], deliveryDay: null, deliveryWindow: null, addressFilled: false,
  };
  const doc = root.ownerDocument;

  function snapshot() {
    const cartCount = st.cart.reduce((n, l) => n + l.qty, 0);
    return {
      view: st.view, query: st.query, productId: st.productId,
      size: st.size, messageFilled: st.messageFilled,
      cartCount,
      cartHasMessage: st.cart.some((l) => !!l.message),
      deliveryDay: st.deliveryDay, addressFilled: st.addressFilled,
    };
  }
  const emit = () => onChange(snapshot());

  function go(view, extra = {}) {
    Object.assign(st, extra, { view });
    render();
    const main = root.querySelector('#shop-main');
    if (main) { main.focus({ preventScroll: true }); }
    root.scrollTop = 0;
    if (doc.defaultView) doc.defaultView.scrollTo && doc.defaultView.scrollTo(0, 0);
    emit();
  }

  function header() {
    const count = st.cart.reduce((n, l) => n + l.qty, 0);
    return `
      <header class="shop-header">
        <button class="brand" data-act="home" aria-label="Corner Market home">
          <span class="brand-mark" aria-hidden="true">CM</span><span>Corner Market</span>
        </button>
        <form class="search" role="search" data-guide="search">
          <span class="search-icon" aria-hidden="true">⌕</span>
          <label class="sr-only" for="q">Search Corner Market</label>
          <input id="q" name="q" type="search" autocomplete="off" placeholder="Search Corner Market" value="${esc(st.query)}">
        </form>
        <button class="cart-btn" data-act="cart" data-guide="cart" aria-label="Cart, ${count} item${count === 1 ? '' : 's'}">
          <span aria-hidden="true">🧺</span> Cart <span class="cart-count">${count}</span>
        </button>
      </header>
      <div class="demo-banner" role="note">Demo shop for a research study. Nothing is bought and no payment is taken.</div>`;
  }

  function home() {
    return `
      <section class="hero"><h1>Fresh groceries, delivered</h1><p>Search for anything, or browse what's popular this week.</p></section>
      <h2 class="section-title">Popular this week</h2>
      <div class="grid">${PRODUCTS.slice(2).map(card).join('')}</div>`;
  }

  function card(p) {
    return `
      <article class="card" data-guide="product-${p.id}">
        <button class="card-hit" data-act="open" data-id="${p.id}" aria-label="${esc(p.name)}, ${money(p.price)}">
          <div class="card-art">${art(p.art, 96)}</div>
          <div class="card-name">${esc(p.name)}</div>
          <div class="card-meta">${esc(p.unit)}</div>
          <div class="card-price">${money(p.price)}</div>
        </button>
      </article>`;
  }

  function results() {
    const q = st.query.trim().toLowerCase();
    const words = q.split(/\s+/).filter(Boolean);
    const hits = PRODUCTS
      .map((p) => ({ p, score: words.filter((w) => (p.name + ' ' + p.blurb).toLowerCase().includes(w.replace(/s$/, ''))).length }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.p);
    return `
      <h1 class="page-title">Results for “${esc(st.query)}”</h1>
      ${hits.length ? `<div class="grid">${hits.map(card).join('')}</div>`
        : `<p class="empty">No results. Try a simpler word, like “cake”.</p>`}`;
  }

  function product() {
    const p = PRODUCTS.find((x) => x.id === st.productId);
    if (!p) return results();
    const sizes = p.sizes || [];
    return `
      <button class="back-link" data-act="back-results">‹ Back to results</button>
      <div class="product">
        <div class="product-art">${art(p.art, 240)}</div>
        <div class="product-info">
          <h1>${esc(p.name)}</h1>
          <div class="price">${money(p.price)} <span class="unit">${esc(p.unit)}</span></div>
          <p class="blurb">${esc(p.blurb)}</p>
          <details open><summary>Details and ingredients</summary><p>${esc(p.details)}</p></details>
          ${sizes.length ? `
          <fieldset class="sizes" data-guide="size">
            <legend>Choose a size</legend>
            ${sizes.map((s) => `<button type="button" class="pill ${st.size === s ? 'on' : ''}" aria-pressed="${st.size === s}" data-act="size" data-size="${s}">${s}</button>`).join('')}
            ${st.sizeError ? '<p class="field-error" role="alert">Please choose a size first.</p>' : ''}
          </fieldset>` : ''}
          ${p.custom ? `
          <div class="field" data-guide="message">
            <label for="msg">Message on the cake <span class="opt">(optional, up to 40 letters)</span></label>
            <input id="msg" maxlength="40" autocomplete="off">
          </div>` : ''}
          <button class="primary" data-act="add" data-guide="add-to-cart">Add to cart</button>
        </div>
      </div>`;
  }

  function cart() {
    if (!st.cart.length) return `<h1 class="page-title">Your cart</h1><p class="empty">Your cart is empty.</p>`;
    const total = st.cart.reduce((n, l) => n + l.price * l.qty, 0);
    return `
      <h1 class="page-title">Your cart</h1>
      <div class="cart-layout">
        <ul class="lines">${st.cart.map((l, i) => `
          <li class="line"><div class="line-art">${art(l.art, 64)}</div>
            <div><div class="line-name">${esc(l.name)}</div>
              <div class="line-meta">${[l.size, l.message ? `Message: “${esc(l.message)}”` : null].filter(Boolean).join(' · ')}</div></div>
            <div class="line-price">${money(l.price * l.qty)}</div>
            <button class="link" data-act="remove" data-ix="${i}">Remove</button></li>`).join('')}
        </ul>
        <aside class="totals"><div class="row"><span>Total</span><strong>${money(total)}</strong></div>
          <button class="primary" data-act="checkout" data-guide="checkout">Go to checkout</button></aside>
      </div>`;
  }

  function checkout() {
    const total = st.cart.reduce((n, l) => n + l.price * l.qty, 0) + 3.99;
    return `
      <h1 class="page-title">Checkout</h1>
      <div class="cart-layout">
        <form class="checkout" data-form="checkout" novalidate>
          <fieldset data-guide="delivery-day"><legend>Delivery day</legend>
            ${DAYS.map((d) => `<button type="button" class="pill ${st.deliveryDay === d ? 'on' : ''}" aria-pressed="${st.deliveryDay === d}" data-act="day" data-day="${d}">${d}</button>`).join('')}
            ${st.deliveryDay ? `<div class="windows" aria-label="Time window">${WINDOWS.map((w) => `<button type="button" class="pill small ${st.deliveryWindow === w ? 'on' : ''}" aria-pressed="${st.deliveryWindow === w}" data-act="window" data-window="${w}">${w}</button>`).join('')}</div>` : ''}
          </fieldset>
          <fieldset data-guide="address"><legend>Deliver to</legend>
            <label>Street address <input name="street" autocomplete="off" data-private></label>
            <label>Town or city <input name="town" autocomplete="off" data-private></label>
            <label>ZIP code <input name="zip" inputmode="numeric" autocomplete="off" data-private></label>
          </fieldset>
          <fieldset><legend>Payment</legend><p class="muted">Demo shop: no payment is taken.</p></fieldset>
        </form>
        <aside class="totals" data-guide="summary"><h2>Order summary</h2>
          ${st.cart.map((l) => `<div class="row"><span>${esc(l.name)}${l.size ? `, ${l.size}` : ''}${l.message ? `<br><small>“${esc(l.message)}”</small>` : ''}</span><span>${money(l.price * l.qty)}</span></div>`).join('')}
          <div class="row"><span>Delivery${st.deliveryDay ? `, ${st.deliveryDay}${st.deliveryWindow ? ' ' + st.deliveryWindow : ''}` : ''}</span><span>$3.99</span></div>
          <div class="row total"><span>Total</span><strong>${money(total)}</strong></div>
          <p class="field-error" role="alert" data-place-error hidden></p>
          <button class="primary" data-act="place" data-guide="place-order">Place order</button>
        </aside>
      </div>`;
  }

  function confirmation() {
    return `
      <div class="confirm"><div class="confirm-art">${art('cake-choc', 120)}</div>
        <h1>Order placed</h1>
        <p>Your order will arrive ${esc(st.deliveryDay || 'soon')}${st.deliveryWindow ? `, ${esc(st.deliveryWindow)}` : ''}.</p>
        <p class="muted">This is a demo, so nothing was really ordered.</p>
        <button class="secondary" data-act="home">Back to the shop</button></div>`;
  }

  function render() {
    const view = { home, results, product, cart, checkout, confirmation }[st.view] || home;
    root.innerHTML = `${header()}<main id="shop-main" tabindex="-1" class="shop-main">${view()}</main>`;
  }

  // ── Events: only the PERSON's actions reach here. ──
  root.addEventListener('submit', (e) => {
    const form = e.target;
    if (form.matches('form.search')) {
      e.preventDefault();
      const q = form.querySelector('input').value.trim();
      if (q) go('results', { query: q });
    } else if (form.matches('[data-form="checkout"]')) {
      e.preventDefault();
    }
  });

  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || !root.contains(b)) return;
    const act = b.dataset.act;
    if (act === 'home') return go('home');
    if (act === 'cart') return go('cart');
    if (act === 'open') savedMessage = '';
    if (act === 'open') return go('product', { productId: b.dataset.id, size: null, messageFilled: false, sizeError: false });
    if (act === 'back-results') return go(st.query ? 'results' : 'home');
    if (act === 'size') { st.size = b.dataset.size; st.sizeError = false; render(); restoreMessage(); return emit(); }
    if (act === 'add') {
      const p = PRODUCTS.find((x) => x.id === st.productId);
      if (p.sizes && !st.size) { const msg = readMessage(); st.sizeError = true; render(); restoreMessage(msg); return emit(); }
      st.cart.push({ id: p.id, name: p.name, price: p.price, art: p.art, qty: 1, size: st.size, message: readMessage() || null });
      b.textContent = 'Added ✓';
      updateCartBadge();
      return emit();
    }
    if (act === 'remove') { st.cart.splice(Number(b.dataset.ix), 1); return go('cart'); }
    if (act === 'checkout') return go('checkout');
    if (act === 'day') { st.deliveryDay = b.dataset.day; keepAddress(() => render()); return emit(); }
    if (act === 'window') { st.deliveryWindow = b.dataset.window; keepAddress(() => render()); return emit(); }
    if (act === 'place') {
      const err = root.querySelector('[data-place-error]');
      const missing = [!st.deliveryDay && 'a delivery day', !st.addressFilled && 'the address'].filter(Boolean);
      if (missing.length) { err.hidden = false; err.textContent = `Please add ${missing.join(' and ')}.`; return; }
      st.cart = [];
      return go('confirmation', { addressFilled: false });
    }
  });

  root.addEventListener('input', (e) => {
    if (e.target.id === 'msg') {
      const filled = !!e.target.value.trim();
      if (filled !== st.messageFilled) { st.messageFilled = filled; emit(); }
    } else if (e.target.matches('[data-private]')) {
      const all = [...root.querySelectorAll('[data-private]')].every((i) => i.value.trim());
      if (all !== st.addressFilled) { st.addressFilled = all; emit(); }
    }
  });

  // Re-rendering must not wipe what the person typed.
  let savedMessage = '';
  function readMessage() { const i = root.querySelector('#msg'); return i ? i.value.trim() : ''; }
  function restoreMessage(v) {
    const i = root.querySelector('#msg');
    const val = v != null ? v : savedMessage;
    if (i && val) i.value = val;
  }
  root.addEventListener('input', (e) => { if (e.target.id === 'msg') savedMessage = e.target.value; });
  function keepAddress(fn) {
    const vals = [...root.querySelectorAll('[data-private]')].map((i) => [i.name, i.value]);
    fn();
    for (const [n, v] of vals) { const i = root.querySelector(`[data-private][name="${n}"]`); if (i) i.value = v; }
  }
  function updateCartBadge() {
    const count = st.cart.reduce((n, l) => n + l.qty, 0);
    const c = root.querySelector('.cart-count'); if (c) c.textContent = count;
    const btn = root.querySelector('.cart-btn'); if (btn) btn.setAttribute('aria-label', `Cart, ${count} item${count === 1 ? '' : 's'}`);
  }

  render();
  return {
    get state() { return snapshot(); },
    /** Notify listeners after the host wires up (initial state). */
    emit,
    reset() { Object.assign(st, { view: 'home', query: '', productId: null, size: null, messageFilled: false, sizeError: false, cart: [], deliveryDay: null, deliveryWindow: null, addressFilled: false }); savedMessage = ''; render(); emit(); },
  };
}
