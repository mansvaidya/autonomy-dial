import test from 'node:test';
import assert from 'node:assert/strict';
import { createTeacher, parseUtterance } from '../src/teacher.js';
import { birthdayCake } from '../src/lessons/birthday-cake.js';

const base = { view: 'home', query: '', productId: null, size: null, messageFilled: false, cartCount: 0, cartHasMessage: false, deliveryDay: null, addressFilled: false };
const at = (patch) => ({ ...base, ...patch });

test('parses what the person wants', () => {
  assert.equal(parseUtterance('Can you just click it for me?'), 'act');
  assert.equal(parseUtterance("I can't find the size"), 'hint');
  assert.equal(parseUtterance('why do I need to do that'), 'why');
  assert.equal(parseUtterance('say that again'), 'repeat');
  assert.equal(parseUtterance("okay I'm there"), 'done');
  assert.equal(parseUtterance('less detail please'), 'shorter');
  assert.equal(parseUtterance('stop'), 'stop');
  assert.equal(parseUtterance('sounds good'), 'yes');
});

test('opens with the Teacher framing and the first step', () => {
  const t = createTeacher({ lesson: birthdayCake });
  t.observe(base, 0);
  const turn = t.hear("My granddaughter's birthday is this weekend and I'd like to send a cake", 0);
  assert.equal(turn.phase, 'teaching');
  assert.match(turn.say, /you'll be the one clicking/);
  assert.match(turn.say, /search box/);
  assert.equal(turn.highlight.target, '[data-guide="search"]');
});

test('walks the whole task as the person acts, then closes reflectively', () => {
  const t = createTeacher({ lesson: birthdayCake });
  t.observe(base, 0);
  t.start(0);
  const path = [
    at({ view: 'results', query: 'chocolate cake' }),
    at({ view: 'product', query: 'chocolate cake', productId: 'chocolate-cake' }),
    at({ view: 'product', query: 'chocolate cake', productId: 'chocolate-cake', size: '10 inch' }),
    at({ view: 'product', query: 'chocolate cake', productId: 'chocolate-cake', size: '10 inch', messageFilled: true }),
    at({ view: 'product', query: 'chocolate cake', productId: 'chocolate-cake', size: '10 inch', messageFilled: true, cartCount: 1, cartHasMessage: true }),
    at({ view: 'cart', query: 'chocolate cake', cartCount: 1, cartHasMessage: true }),
    at({ view: 'checkout', query: 'chocolate cake', cartCount: 1, cartHasMessage: true }),
    at({ view: 'checkout', query: 'chocolate cake', cartCount: 1, cartHasMessage: true, deliveryDay: 'Saturday' }),
    at({ view: 'checkout', query: 'chocolate cake', cartCount: 1, cartHasMessage: true, deliveryDay: 'Saturday', addressFilled: true }),
  ];
  const targets = [];
  for (const s of path) { const turn = t.observe(s, 1); targets.push(turn.highlight && turn.highlight.target); }
  assert.deepEqual(targets, [
    '[data-guide="product-chocolate-cake"]', '[data-guide="size"]', '[data-guide="message"]', '[data-guide="add-to-cart"]',
    '[data-guide="cart"]', '[data-guide="checkout"]', '[data-guide="delivery-day"]', '[data-guide="address"]', '[data-guide="summary"]',
  ]);
  const end = t.observe(at({ view: 'confirmation', query: 'chocolate cake' }), 2);
  assert.equal(end.phase, 'done');
  assert.equal(end.highlight, null);
  assert.match(end.say, /You did it/);
  assert.match(end.say, /added a message/);
});

test('never acts: asking it to do the step gets a refusal and a pointer', () => {
  const t = createTeacher({ lesson: birthdayCake });
  t.observe(base, 0); t.start(0);
  const turn = t.hear('can you do it for me', 1);
  assert.match(turn.say, /won't click for you/);
  assert.equal(turn.highlight.target, '[data-guide="search"]');
  assert.ok(turn.highlight.level >= 1);
  // Turns only ever carry speech and a highlight.
  assert.deepEqual(Object.keys(turn).sort(), ['highlight', 'phase', 'say', 'stepIndex', 'tone']);
});

test('typing the message before choosing a size does not skip the size step', () => {
  const t = createTeacher({ lesson: birthdayCake });
  t.observe(at({ view: 'product', query: 'cake', productId: 'chocolate-cake' }), 0);
  t.start(0);
  assert.equal(t.step.id, 'size');
  t.observe(at({ view: 'product', query: 'cake', productId: 'chocolate-cake', messageFilled: true }), 1);
  assert.equal(t.step.id, 'size');
  const turn = t.observe(at({ view: 'product', query: 'cake', productId: 'chocolate-cake', messageFilled: true, size: '7 inch' }), 2);
  assert.equal(t.step.id, 'add-to-cart', 'message already done, so it moves past it');
  assert.match(turn.say, /Add to cart/);
});

test('friction escalates hints and brightness, but caps unprompted nudges', () => {
  const t = createTeacher({ lesson: birthdayCake, stuckAfterMs: 1000 });
  t.observe(at({ view: 'product', query: 'cake', productId: 'chocolate-cake' }), 0);
  t.start(0);
  assert.equal(t.tick(500), null, 'no nudge before the quiet period');
  const n1 = t.tick(1000); assert.ok(n1.say); assert.equal(n1.highlight.level, 1);
  const n2 = t.tick(2000); assert.ok(n2.say); assert.ok(n2.highlight.level >= 1);
  assert.equal(t.tick(3000), null, 'stops after two nudges');
  assert.equal(t.tick(10000), null);
  const asked = t.hear("I can't find it", 10001);
  assert.equal(asked.highlight.level, 2);
});

test('moving to another page gets a one-time way back', () => {
  const t = createTeacher({ lesson: birthdayCake });
  t.observe(at({ view: 'product', query: 'cake', productId: 'chocolate-cake' }), 0);
  t.start(0);
  const off = t.observe(at({ view: 'cart', query: 'cake' }), 1);
  assert.match(off.say, /different page/);
  assert.equal(off.highlight.target, '[data-guide="search"]');
  assert.equal(t.observe(at({ view: 'home', query: 'cake' }), 2), null, 'does not repeat itself');
  const back = t.observe(at({ view: 'product', query: 'cake', productId: 'chocolate-cake' }), 3);
  assert.equal(back.highlight.target, '[data-guide="size"]');
});

test('sensitive steps say the person types it and the Teacher cannot see it', () => {
  const t = createTeacher({ lesson: birthdayCake });
  t.observe(at({ view: 'checkout', query: 'cake', cartCount: 1, deliveryDay: 'Friday' }), 0);
  const turn = t.start(0);
  assert.equal(t.step.id, 'address');
  assert.match(turn.say, /you type it yourself/i);
});

test('tone changes wording, not guidance', () => {
  const run = (tone) => {
    const t = createTeacher({ lesson: birthdayCake, tone });
    t.observe(base, 0); t.start(0);
    return t.observe(at({ view: 'results', query: 'cake' }), 1);
  };
  const warm = run('warm'); const minimal = run('minimal');
  assert.equal(warm.highlight.target, minimal.highlight.target);
  assert.ok(warm.say.length > minimal.say.length);
  assert.doesNotMatch(minimal.say, /Wonderful|Nice work|Great|Perfect|That's it/);
});

test('someone who has done it before is offered shorter reminders, and chooses', () => {
  const t = createTeacher({ lesson: birthdayCake, timesCompleted: 1 });
  t.observe(base, 0);
  const offer = t.hear('help me order a cake', 0);
  assert.equal(offer.phase, 'choosing');
  assert.match(offer.say, /before/);
  const short = t.hear('just short reminders', 1);
  assert.equal(short.phase, 'teaching');
  assert.equal(t.shortMode, true);
  assert.match(short.say, /Search for "chocolate cake"/);
  assert.doesNotMatch(short.say, /faster than browsing/);
});

test('"done" when not done is gentle, and checks the real state', () => {
  const t = createTeacher({ lesson: birthdayCake });
  t.observe(base, 0); t.start(0);
  const turn = t.hear('done', 1);
  assert.match(turn.say, /don't see that yet/);
  assert.equal(t.step.id, 'search');
});
