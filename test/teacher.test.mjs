import test from 'node:test';
import assert from 'node:assert/strict';
import { createAgent, createTeacher, parseUtterance, policyFor } from '../src/agent.js';
import { birthdayCake } from '../src/lessons/birthday-cake.js';
import { partyMenu } from '../src/lessons/party-menu.js';

const base = { view: 'home', page: 'home', storeId: null, query: '', productId: null, size: null, messageFilled: false, cartOpen: false, cartCount: 0, cartHasMessage: false, cartHasCake: false, deliveryDay: null, addressFilled: false, days: ['Today', 'Tomorrow', 'Thursday', 'Friday'] };
const at = (patch) => ({ ...base, ...patch });
const CAKE = 'choc-mousse-cake';
const inStore = { storeId: 'summit', view: 'store', page: 'store' };
const onCake = { ...inStore, view: 'product', query: 'chocolate cake', productId: CAKE };
const inCart = { storeId: 'summit', query: 'chocolate cake', cartCount: 1, cartHasCake: true, cartHasMessage: true };
const checkout = { ...inCart, view: 'checkout', page: 'checkout' };

test('parses what the person wants', () => {
  assert.equal(parseUtterance('Can you just click it for me?'), 'act');
  assert.equal(parseUtterance("I'll do it myself"), 'mine');
  assert.equal(parseUtterance("I can't find the size"), 'hint');
  assert.equal(parseUtterance('why do I need to do that'), 'why');
  assert.equal(parseUtterance('say that again'), 'repeat');
  assert.equal(parseUtterance("okay I'm there"), 'yes');
  assert.equal(parseUtterance("I'm there"), 'done');
  assert.equal(parseUtterance('less detail please'), 'shorter');
  assert.equal(parseUtterance('stop'), 'stop');
});

test('the dial hands more kinds of steps to the agent, but never private or final ones', () => {
  const who = (L) => ['find', 'choose', 'do', 'private', 'commit'].map((k) => policyFor(L).owner(k)).join(' ');
  assert.equal(who(2), 'user user user user user');
  assert.equal(who(4), 'offer user user user user');
  assert.equal(who(5), 'user user user user user');
  assert.equal(who(6), 'agent user user user user');
  assert.equal(who(7), 'agent user agent user user');
  assert.equal(who(8), 'agent agent agent user user');
  assert.equal(who(9), 'agent agent agent user user');
  assert.deepEqual([1, 3, 4, 5, 8].map((L) => policyFor(L).band), ['teacher', 'teacher', 'helper', 'helper', 'autopilot']);
});

// ── Teacher (dial 2) ──

test('Teacher opens with the framing and the first step', () => {
  const t = createTeacher({ lesson: birthdayCake, pointing: 'now' });
  t.observe(base, 0);
  const turn = t.hear("My granddaughter's birthday is this weekend and I'd like to send a cake", 0);
  assert.equal(turn.phase, 'active');
  assert.match(turn.say, /you'll be the one clicking/);
  assert.match(turn.say, /choose the store/);
  assert.equal(turn.highlight.target, '[data-guide="store-summit"]');
  assert.equal(turn.act, null);
});

test('Teacher walks the whole task as the person acts, then closes reflectively', () => {
  const t = createTeacher({ lesson: birthdayCake, pointing: 'now' });
  t.observe(base, 0);
  t.start(0);
  const path = [
    at(inStore),
    at({ ...inStore, view: 'results', page: 'search', query: 'chocolate cake' }),
    at(onCake),
    at({ ...onCake, size: '10 inch' }),
    at({ ...onCake, size: '10 inch', messageFilled: true }),
    at({ ...onCake, size: '10 inch', messageFilled: true, ...inCart }),
    at({ ...inCart, view: 'cart', cartOpen: true }),
    at(checkout),
    at({ ...checkout, addressFilled: true }),
    at({ ...checkout, addressFilled: true, deliveryDay: 'Tomorrow 1pm–3pm' }),
  ];
  const targets = [];
  for (const s of path) { const turn = t.observe(s, 1); assert.equal(turn.act, null, 'Teacher never acts'); targets.push(turn.highlight && turn.highlight.target); }
  assert.deepEqual(targets, [
    '[data-guide="search"]', '[data-guide="product-choc-mousse-cake"]', '[data-guide="size"]', '[data-guide="message"]', '[data-guide="add-to-cart"]',
    '[data-guide="view-cart"], [data-guide="cart"]', '[data-guide="checkout"]', '[data-guide="address"]', '[data-guide="delivery-day"]', '[data-guide="summary"]',
  ]);
  const end = t.observe(at({ view: 'confirmation', page: 'confirmation', storeId: 'summit' }), 2);
  assert.equal(end.phase, 'done');
  assert.match(end.say, /You did it/);
  assert.match(end.say, /all by yourself/);
});

test('Teacher declines "do it for me" and points instead', () => {
  const t = createTeacher({ lesson: birthdayCake });
  t.observe(base, 0); t.start(0);
  const turn = t.hear('can you do it for me', 1);
  assert.match(turn.say, /won't click for you/);
  assert.equal(turn.act, null);
  assert.ok(turn.highlight.level >= 1);
});

test('typing the message before choosing a size does not skip the size step', () => {
  const t = createTeacher({ lesson: birthdayCake });
  t.observe(at(onCake), 0);
  t.start(0);
  assert.equal(t.step.id, 'size');
  t.observe(at({ ...onCake, messageFilled: true }), 1);
  assert.equal(t.step.id, 'size');
  t.observe(at({ ...onCake, messageFilled: true, size: '7 inch' }), 2);
  assert.equal(t.step.id, 'add-to-cart');
});

test('friction escalates hints and brightness, but caps unprompted nudges', () => {
  const t = createTeacher({ lesson: birthdayCake, stuckAfterMs: 1000, familiarity: 1 });
  t.observe(at(onCake), 0);
  t.start(0);
  assert.equal(t.tick(500), null);
  const n1 = t.tick(1000); assert.ok(n1.say); assert.equal(n1.highlight.level, 1);
  const n2 = t.tick(2000); assert.ok(n2.say);
  assert.equal(t.tick(3000), null);
  assert.equal(t.hear("I can't find it", 10001).highlight.level, 2);
});

test('moving to another page gets a one-time way back', () => {
  const t = createTeacher({ lesson: birthdayCake, pointing: 'now' });
  t.observe(at(onCake), 0);
  t.start(0);
  const off = t.observe(at({ ...inStore, view: 'results', page: 'search', query: 'chocolate cake' }), 1);
  assert.match(off.say, /different page/);
  assert.equal(t.observe(at({ ...inStore }), 2), null);
  assert.equal(t.observe(at(onCake), 3).highlight.target, '[data-guide="size"]');
});

test('at Autopilot the default tone is brief, like the paper\'s Autopilot', () => {
  const a = createAgent({ lesson: birthdayCake, autonomy: 8 });
  a.observe(at(checkout), 0);
  assert.match(a.start(0).say, /^On it/);
  assert.match(a.observe(at(checkout), 1) ? '' : 'ok', /ok/);
});

test('tone changes wording, not guidance', () => {
  const run = (tone) => { const t = createAgent({ lesson: birthdayCake, tone, pointing: 'now' }); t.observe(base, 0); t.start(0); return t.observe(at(inStore), 1); };
  const warm = run('warm'); const minimal = run('minimal');
  assert.equal(warm.highlight.target, minimal.highlight.target);
  assert.ok(warm.say.length > minimal.say.length);
});

test('familiarity: someone who has done it before is offered shorter reminders', () => {
  const t = createTeacher({ lesson: birthdayCake, timesCompleted: 1 });
  t.observe(base, 0);
  assert.equal(t.hear('help me order a cake', 0).phase, 'choosing');
  const short = t.hear('just short reminders', 1);
  assert.equal(t.familiarity, 2);
  assert.match(short.say, /Click Summit Warehouse Club/);
});

test('familiarity dial: "know it well" gives short reminders without reasons', () => {
  const full = createAgent({ lesson: birthdayCake, familiarity: 0 }); full.observe(base, 0);
  const short = createAgent({ lesson: birthdayCake, familiarity: 2 }); short.observe(base, 0);
  const a = full.start(0).say, b = short.start(0).say;
  assert.match(a, /many stores/);
  assert.doesNotMatch(b, /many stores/);
});

// ── Helper (dial 5) ──

test('Helper lets you lead, and takes over a step only when you ask', () => {
  const h = createAgent({ lesson: birthdayCake, autonomy: 5 });
  h.observe(base, 0);
  const intro = h.start(0);
  assert.match(intro.say, /try it yourself/);
  assert.equal(intro.act, null);
  const rescue = h.hear("I can't find it", 1);
  assert.deepEqual(rescue.act, { stepId: 'choose-store', value: null });
  assert.match(rescue.say, /Let me do that one for you/);
  const next = h.observe(at(inStore), 2); // the hands did it
  assert.equal(next.act, null);
  assert.match(next.say, /Your turn again/);
});

test('Helper asks before making a choice for you', () => {
  const h = createAgent({ lesson: birthdayCake, autonomy: 5 });
  h.observe(at(onCake), 0); h.start(0);
  const q = h.hear('help', 1);
  assert.equal(q.awaiting, 'ask');
  assert.match(q.say, /Which size/);
  const a = h.hear('the big one', 2);
  assert.deepEqual(a.act, { stepId: 'size', value: '10 inch' });
});

// ── Autopilot (dial 8) ──

test('Autopilot does the steps, asks for choices, and hands back private and final steps', () => {
  const a = createAgent({ lesson: birthdayCake, autonomy: 8, tone: 'warm' });
  a.observe(base, 0);
  let t = a.start(0, 'Order a chocolate cake, 10 inch, delivered tomorrow afternoon');
  assert.deepEqual(t.act, { stepId: 'choose-store', value: null });
  assert.match(t.say, /Opening Summit/);
  t = a.observe(at(inStore), 1); assert.equal(t.act.stepId, 'search');
  t = a.observe(at({ ...inStore, view: 'results', page: 'search', query: 'chocolate cake' }), 2); assert.equal(t.act.stepId, 'open-product');
  t = a.observe(at(onCake), 3);
  assert.deepEqual(t.act, { stepId: 'size', value: '10 inch' }, 'size came from the request');
  t = a.observe(at({ ...onCake, size: '10 inch' }), 4);
  assert.equal(t.awaiting, 'ask');
  assert.match(t.say, /What would you like written/);
  t = a.hear('Happy Birthday, Maya', 5);
  assert.deepEqual(t.act, { stepId: 'message', value: 'Happy Birthday, Maya' });
  t = a.observe(at({ ...onCake, size: '10 inch', messageFilled: true }), 6); assert.equal(t.act.stepId, 'add-to-cart');
  t = a.observe(at({ ...onCake, ...inCart }), 7); assert.equal(t.act.stepId, 'open-cart');
  t = a.observe(at({ ...inCart, view: 'cart', cartOpen: true }), 8); assert.equal(t.act.stepId, 'checkout');
  t = a.observe(at(checkout), 9);
  assert.equal(t.act, null, 'address is handed back');
  assert.match(t.say, /This part is yours/);
  assert.match(a.hear('can you type it for me', 10).say, /don't type private details/);
  t = a.observe(at({ ...checkout, addressFilled: true }), 11);
  assert.deepEqual(t.act.value, { day: 'Tomorrow', slot: '1pm–3pm' }, 'delivery time came from the request');
  t = a.observe(at({ ...checkout, addressFilled: true, deliveryDay: 'Tomorrow 1pm–3pm' }), 12);
  assert.equal(t.act, null, 'the final decision is handed back');
  assert.match(t.say, /This decision is yours/);
  assert.match(a.hear('just place the order', 13).say, /stays with you/);
  const end = a.observe(at({ view: 'confirmation', page: 'confirmation' }), 14);
  assert.equal(end.phase, 'done');
  assert.match(end.say, /entered the address/);
});

test('"no message" lets the agent skip the message step', () => {
  const a = createAgent({ lesson: birthdayCake, autonomy: 8 });
  a.observe(at({ ...onCake, size: '7 inch' }), 0);
  a.start(0);
  const t = a.hear('no message', 1);
  assert.deepEqual(t.act, { stepId: 'message', value: '' });
  const next = a.stepSkipped(2);
  assert.equal(next.act.stepId, 'add-to-cart');
});

test('turning the dial mid-task re-describes the current step', () => {
  const a = createAgent({ lesson: birthdayCake, autonomy: 2, tone: 'warm' });
  a.observe(at(inStore), 0); a.start(0);
  const up = a.setAutonomy(8, 1);
  assert.match(up.say, /I'll take it from here/);
  assert.equal(up.act.stepId, 'search');
  a.observe(at({ ...inStore, view: 'results', page: 'search', query: 'chocolate cake' }), 2);
  const down = a.setAutonomy(2, 3);
  assert.equal(down.act, null);
  assert.match(down.say, /you'll do the clicking/);
});

test('if the agent can\'t do a step, it hands it to the person', () => {
  const a = createAgent({ lesson: birthdayCake, autonomy: 8 });
  a.observe(base, 0); a.start(0);
  const f = a.actFailed(1);
  assert.match(f.say, /Could you/);
  assert.equal(a.awaiting, null);
});

// ── Party menu ──

const pw = { view: 'home', plannerOpen: false, started: false, guests: 0, vegCount: 0, nutAllergy: false, budget: 0, detailsOk: false, filters: { nutFree: false }, menuCount: 0, menuHasMain: false, menuHasVegMain: false, menuHasSide: false, menuHasDessert: false, menuHasNuts: false, total: 0, overBudget: false, reviewed: false, listMade: false, sent: false };
const pwAt = (p) => ({ ...pw, ...p, filters: { ...pw.filters, ...(p.filters || {}) } });

test('party menu: Teacher path, nut warning, and the vegetarian step is skipped when already met', () => {
  const t = createTeacher({ lesson: partyMenu });
  t.observe(pw, 0); t.start(0);
  assert.equal(t.step.id, 'open-planner');
  t.observe(pwAt({ view: 'setup', plannerOpen: true }), 1);
  assert.equal(t.step.id, 'party-details');
  t.observe(pwAt({ view: 'setup', plannerOpen: true, detailsOk: true, nutAllergy: true, guests: 10, vegCount: 2, budget: 250 }), 2);
  const browse = { view: 'browse', plannerOpen: true, started: true, detailsOk: true, nutAllergy: true, guests: 10, vegCount: 2, budget: 250 };
  t.observe(pwAt(browse), 3);
  assert.equal(t.step.id, 'nut-filter');
  t.observe(pwAt({ ...browse, filters: { nutFree: true } }), 4);
  assert.equal(t.step.id, 'add-main');
  const warn = t.observe(pwAt({ ...browse, filters: { nutFree: true }, menuCount: 1, menuHasNuts: true, nutDish: 'Carrot Cake with Walnuts', menuHasDessert: true }), 5);
  assert.match(warn.say, /contains nuts/);
  const veg = t.observe(pwAt({ ...browse, filters: { nutFree: true }, menuCount: 2, menuHasMain: true, menuHasVegMain: true, menuHasDessert: true }), 6);
  assert.equal(t.step.id, 'add-side', 'a vegetarian main counts for both main steps');
  assert.match(veg.say, /side/);
});

test('party menu at Autopilot: suggests dishes, "yes" accepts, and sending the list is handed back', () => {
  const a = createAgent({ lesson: partyMenu, autonomy: 8, tone: 'warm' });
  a.observe(pw, 0);
  assert.equal(a.start(0).act.stepId, 'open-planner');
  let t = a.observe(pwAt({ view: 'setup', plannerOpen: true }), 1);
  assert.equal(t.awaiting, 'ask');
  assert.match(t.say, /10 guests, 2 vegetarians/);
  t = a.hear('yes please', 2);
  assert.equal(t.act.stepId, 'party-details');
  const browse = { view: 'browse', plannerOpen: true, started: true, detailsOk: true, nutAllergy: true };
  t = a.observe(pwAt({ ...browse, view: 'setup', started: false }), 3);
  assert.equal(t.act.stepId, 'start-planning');
  t = a.observe(pwAt(browse), 4); assert.equal(t.act.stepId, 'nut-filter');
  t = a.observe(pwAt({ ...browse, filters: { nutFree: true } }), 5);
  assert.match(t.say, /I suggest the Herb Roast Chicken/);
  t = a.hear('the lasagna instead', 6);
  assert.deepEqual(t.act, { stepId: 'add-main', value: 'veg-lasagna' });
  t = a.observe(pwAt({ ...browse, filters: { nutFree: true }, menuCount: 1, menuHasMain: true, menuHasVegMain: true }), 7);
  assert.equal(a.step.id, 'add-side');
  t = a.hear('sure', 8); assert.deepEqual(t.act, { stepId: 'add-side', value: 'roast-veg' });
  t = a.observe(pwAt({ ...browse, menuCount: 2, menuHasMain: true, menuHasVegMain: true, menuHasSide: true }), 9);
  t = a.hear('yes', 10); assert.deepEqual(t.act, { stepId: 'add-dessert', value: 'brownies' });
  t = a.observe(pwAt({ ...browse, menuCount: 3, menuHasMain: true, menuHasVegMain: true, menuHasSide: true, menuHasDessert: true }), 11);
  assert.equal(t.act.stepId, 'review');
  t = a.observe(pwAt({ ...browse, view: 'review', reviewed: true }), 12); assert.equal(t.act.stepId, 'make-list');
  t = a.observe(pwAt({ ...browse, view: 'list', reviewed: true, listMade: true }), 13);
  assert.equal(t.act, null);
  assert.match(t.say, /This decision is yours/);
});

test('dial 9 picks suggested dishes without asking', () => {
  const a = createAgent({ lesson: partyMenu, autonomy: 9 });
  a.observe(pwAt({ view: 'browse', plannerOpen: true, started: true, detailsOk: true, filters: { nutFree: true } }), 0);
  const t = a.start(0);
  assert.deepEqual(t.act, { stepId: 'add-main', value: 'roast-chicken' });
});

// ── Built-in wait time and uncertainty sensing ──

test('Teacher gives wait time: speaks the step, points only after a few seconds', () => {
  const t = createTeacher({ lesson: birthdayCake, familiarity: 0 });
  t.observe(base, 0);
  const first = t.start(0);
  assert.match(first.say, /choose the store/);
  assert.equal(first.highlight, null, 'not pointing yet');
  assert.equal(t.tick(3000), null);
  const shown = t.tick(4000);
  assert.equal(shown.say, null, 'shown quietly');
  assert.equal(shown.highlight.target, '[data-guide="store-summit"]');
  assert.equal(shown.reveal, 'wait-time');
});

test('Teacher points sooner when the person seems unsure, then teaches', () => {
  const t = createTeacher({ lesson: birthdayCake, familiarity: 0, tone: 'warm' });
  t.observe(base, 0); t.start(0);
  assert.equal(t.signal('empty-click', 500), null, 'one sign is not enough');
  const shown = t.signal('empty-click', 800);
  assert.match(shown.say, /show you where/);
  assert.equal(shown.highlight.target, '[data-guide="store-summit"]');
  assert.equal(shown.reveal, 'unsure:empty-click');
  t.signal('wander', 1500); t.signal('empty-click', 1800);
  const hint = t.signal('scroll-hunt', 2000);
  assert.match(hint.say, /No rush/);
  assert.ok(hint.highlight.level >= 1);
});

test('familiarity lengthens the wait; level 1 shortens it', () => {
  const known = createAgent({ lesson: birthdayCake, autonomy: 2, familiarity: 2 }); known.observe(base, 0); known.start(0);
  assert.equal(known.tick(6000), null);
  assert.ok(known.tick(9000).highlight);
  const extra = createAgent({ lesson: birthdayCake, autonomy: 1, familiarity: 0 }); extra.observe(base, 0); extra.start(0);
  assert.ok(extra.tick(2000).highlight);
});

test('Helper stays quiet until the person seems unsure, then offers to do the step', () => {
  const h = createAgent({ lesson: birthdayCake, autonomy: 5, tone: 'warm' });
  h.observe(base, 0);
  assert.equal(h.start(0).highlight, null);
  assert.equal(h.tick(15000), null, 'no wait-time pointing at Helper');
  const shown = h.signal('wander', 16000) || h.signal('wander', 16500);
  assert.ok(shown && shown.highlight, 'points once unsure');
  h.signal('empty-click', 17000); h.signal('empty-click', 17200);
  const offer = h.signal('scroll-hunt', 17400);
  assert.equal(offer.awaiting, 'rescue');
  assert.match(offer.say, /do just this step/);
  assert.equal(h.hear('yes please', 18000).act.stepId, 'choose-store');
});

test('asking "where is it" points right away, wait time or not', () => {
  const t = createTeacher({ lesson: birthdayCake });
  t.observe(base, 0); t.start(0);
  assert.ok(t.hear('where is it?', 100).highlight);
});

test('Autopilot hand-back steps are pointed at right away', () => {
  const a = createAgent({ lesson: birthdayCake, autonomy: 8 });
  a.observe(at(checkout), 0);
  assert.equal(a.start(0).highlight.target, '[data-guide="address"]');
});
