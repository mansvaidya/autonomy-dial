// payment.js — card checks for the demo checkout.
//
// The shop accepts ONE card: the printed test card handed out in study
// sessions (test-card.html). Any other card, real or invented, is refused
// with a plain message, so a participant can never "pay" with a real card.
// Nothing here stores, logs or sends card details; callers get back only
// whether the card is the test card and the wording of any problem.

export const TEST_CARD = Object.freeze({
  name: 'ALEX MORGAN',
  number: '4242424242424242',
  expiry: '12/30',
  cvc: '123',
});

const digits = (s) => String(s || '').replace(/\D/g, '');

export function formatCardNumber(s) {
  return digits(s).slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
}

export function luhn(num) {
  const d = digits(num);
  if (d.length < 12) return false;
  let sum = 0;
  for (let i = 0; i < d.length; i++) {
    let x = Number(d[d.length - 1 - i]);
    if (i % 2 === 1) { x *= 2; if (x > 9) x -= 9; }
    sum += x;
  }
  return sum % 10 === 0;
}

export function expiryOk(exp, now = new Date()) {
  const m = /^(\d{2})\/(\d{2})$/.exec(String(exp || '').trim());
  if (!m) return false;
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) return false;
  return year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1);
}

const norm = (s) => String(s || '').trim().replace(/\s+/g, ' ').toUpperCase();

/**
 * Check what's typed so far. Errors appear only for fields that look finished,
 * so the person isn't scolded while still typing.
 * @returns {{valid:boolean, errors:Object<string,string>}}
 */
export function checkCard({ name, number, expiry, cvc }, now = new Date()) {
  const errors = {};
  const n = digits(number);
  if (n.length === 16 && !luhn(n)) errors.number = 'That card number doesn’t look right. Check each group of four digits.';
  if (String(expiry || '').length === 5 && !expiryOk(expiry, now)) errors.expiry = 'Check the expiry date (month/year). It may have passed.';
  if (digits(cvc).length >= 3 && digits(cvc).length !== 3) errors.cvc = 'The security code is the 3 digits on the back.';

  const complete = norm(name) && n.length === 16 && String(expiry || '').length === 5 && digits(cvc).length === 3;
  if (!complete || Object.keys(errors).length) return { valid: false, errors };

  const isTest = n === TEST_CARD.number && expiry === TEST_CARD.expiry && digits(cvc) === TEST_CARD.cvc && norm(name) === TEST_CARD.name;
  if (!isTest) return { valid: false, errors: { card: 'This demo only accepts the printed test card. Please check the card you were given.' } };
  return { valid: true, errors: {} };
}
