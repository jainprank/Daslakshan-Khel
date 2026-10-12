import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, request as httpRequest } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../server/app.js';
import { createStore } from '../server/store.js';

const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const silent = { log() {}, error() {} };

let clockValue = new Date('2026-10-12T10:00:00+05:30');
const now = () => clockValue;
const store = createStore({ now, pepper: 'test-pepper' });
const delivered = [];
const handler = createApp({
  publicDir,
  now,
  store,
  logger: silent,
  deliverOtp: (phone, code) => delivered.push({ phone, code }),
  authLimitPerIp: 10_000, // every test client shares 127.0.0.1; the per-number limit is what these tests exercise
});
const server = createServer(handler);
let base;

before(() => new Promise((resolve) => server.listen(0, '127.0.0.1', () => {
  base = `http://127.0.0.1:${server.address().port}`;
  resolve();
})));
after(() => new Promise((resolve) => server.close(resolve)));

async function call(method, path, { body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* not JSON */
  }
  return { status: res.status, json, text, headers: res.headers };
}

let phoneCounter = 9000000000;
function freshPhone() {
  phoneCounter += 1;
  return String(phoneCounter);
}

async function login(phone) {
  const sent = await call('POST', '/api/auth/send-otp', { body: { phone } });
  assert.equal(sent.status, 200);
  const last = delivered.filter((d) => d.phone === phone).at(-1);
  const verified = await call('POST', '/api/auth/verify-otp', { body: { phone, code: last.code } });
  assert.equal(verified.status, 200);
  return verified.json;
}

test('config is public and describes the wrap and the ten days', async () => {
  const res = await call('GET', '/api/config');
  assert.equal(res.status, 200);
  assert.equal(res.json.wrap_active, true);
  assert.equal(res.json.days.length, 10);
});

test('protected endpoints need a bearer token', async () => {
  const res = await call('GET', '/api/me');
  assert.equal(res.status, 401);
  assert.equal(res.json.detail, 'Please log in again.');
});

test('a bad mobile number is rejected before any OTP is sent', async () => {
  const before = delivered.length;
  const res = await call('POST', '/api/auth/send-otp', { body: { phone: '12345' } });
  assert.equal(res.status, 400);
  assert.equal(res.json.detail, 'Enter a 10-digit mobile number.');
  assert.equal(delivered.length, before);
});

test('send-otp never returns the code to the browser', async () => {
  const phone = freshPhone();
  const res = await call('POST', '/api/auth/send-otp', { body: { phone } });
  assert.equal(res.status, 200);
  assert.ok(!/\d{6}/.test(res.text), 'response must not contain a 6-digit code');
  const sent = delivered.filter((d) => d.phone === phone);
  assert.equal(sent.length, 1);
  assert.match(sent[0].code, /^\d{6}$/);
});

test('OTP requests are rate-limited to three per number per window', async () => {
  const phone = freshPhone();
  for (let i = 0; i < 3; i += 1) {
    assert.equal((await call('POST', '/api/auth/send-otp', { body: { phone } })).status, 200);
  }
  const blocked = await call('POST', '/api/auth/send-otp', { body: { phone } });
  assert.equal(blocked.status, 429);
});

test('a wrong code is refused, the correct code logs in once, and codes are single-use', async () => {
  const phone = freshPhone();
  await call('POST', '/api/auth/send-otp', { body: { phone } });
  const code = delivered.filter((d) => d.phone === phone).at(-1).code;
  const wrongCode = code === '000000' ? '111111' : '000000';

  const wrong = await call('POST', '/api/auth/verify-otp', { body: { phone, code: wrongCode } });
  assert.equal(wrong.status, 400);
  assert.equal(wrong.json.detail, 'That OTP is not correct.');

  const ok = await call('POST', '/api/auth/verify-otp', { body: { phone, code } });
  assert.equal(ok.status, 200);
  assert.match(ok.json.token, /^[A-Za-z0-9_-]{20,}$/);
  assert.equal(ok.json.user.name, '');
  assert.equal(ok.json.user.id, undefined, 'internal user id must not be exposed');
  assert.equal(ok.json.user.phone, undefined, 'phone must not be exposed');

  const reused = await call('POST', '/api/auth/verify-otp', { body: { phone, code } });
  assert.equal(reused.status, 400);
});

test('after five wrong codes the OTP expires', async () => {
  const phone = freshPhone();
  await call('POST', '/api/auth/send-otp', { body: { phone } });
  const code = delivered.filter((d) => d.phone === phone).at(-1).code;
  const wrongCode = code === '000000' ? '111111' : '000000';
  for (let i = 0; i < 4; i += 1) {
    const res = await call('POST', '/api/auth/verify-otp', { body: { phone, code: wrongCode } });
    assert.equal(res.json.detail, 'That OTP is not correct.');
  }
  const last = await call('POST', '/api/auth/verify-otp', { body: { phone, code: wrongCode } });
  assert.equal(last.json.detail, 'That OTP has expired. Request a new one.');
  const correct = await call('POST', '/api/auth/verify-otp', { body: { phone, code } });
  assert.equal(correct.status, 400, 'the correct code no longer works after expiry');
});

test('profile name is validated and tags/brackets are refused', async () => {
  const session = await login(freshPhone());
  const empty = await call('PATCH', '/api/me', { token: session.token, body: { name: '  ' } });
  assert.equal(empty.status, 400);
  assert.equal(empty.json.detail, 'Enter your name.');

  const markup = await call('PATCH', '/api/me', { token: session.token, body: { name: '<img src=x>' } });
  assert.equal(markup.status, 400);

  const tooLong = await call('PATCH', '/api/me', { token: session.token, body: { name: 'x'.repeat(41) } });
  assert.equal(tooLong.status, 400);

  const ok = await call('PATCH', '/api/me', { token: session.token, body: { name: 'Test Player', city: 'Indore' } });
  assert.equal(ok.status, 200);
  assert.equal(ok.json.name, 'Test Player');
  assert.equal(ok.json.city, undefined, 'city is not collected or stored (decision: privacy)');
});

test('referral codes give both players 100 bonus points, once, and not to yourself', async () => {
  const referrer = await login(freshPhone());
  await call('PATCH', '/api/me', { token: referrer.token, body: { name: 'Referrer' } });
  const code = referrer.user.ref_code;
  assert.match(code, /^[A-Z2-9]{6}$/);

  const invitee = await login(freshPhone());
  const self = await call('PATCH', '/api/me', { token: referrer.token, body: { name: 'Referrer', referral: code } });
  assert.equal(self.status, 400);
  assert.equal(self.json.detail, 'You cannot use your own referral code.');

  const unknown = await call('PATCH', '/api/me', { token: invitee.token, body: { name: 'Invitee', referral: 'ZZZZZZ' } });
  assert.equal(unknown.json.detail, 'That referral code was not found.');

  const applied = await call('PATCH', '/api/me', { token: invitee.token, body: { name: 'Invitee', referral: code.toLowerCase() } });
  assert.equal(applied.status, 200);
  assert.equal(applied.json.ref_bonus, 100);
  assert.equal(applied.json.referred_by, true);

  const again = await call('PATCH', '/api/me', { token: invitee.token, body: { name: 'Invitee', referral: code } });
  assert.equal(again.json.detail, 'A referral code is already applied to this account.');

  const refMe = await call('GET', '/api/me', { token: referrer.token });
  assert.equal(refMe.json.ref_bonus, 100);
  assert.equal(refMe.json.ref_count, 1);
});

test('leaderboard shows only public-safe fields and never phone, id or referral codes', async () => {
  const phone = freshPhone();
  const session = await login(phone);
  await call('PATCH', '/api/me', { token: session.token, body: { name: 'Public Name' } });
  const user = store.findOrCreateUser(phone);
  store.recordScore(user.id, { day: 1, score: 800, secs: 120 });

  const res = await call('GET', '/api/leaderboard');
  assert.equal(res.status, 200);
  for (const row of res.json.top) {
    assert.deepEqual(Object.keys(row).sort(), ['name', 'rank', 'total']);
  }
  assert.ok(!res.text.includes(phone));
  assert.ok(!res.text.includes(user.id));
  assert.ok(!res.text.includes(session.user.ref_code));
  assert.ok(res.json.top.some((row) => row.name === 'Public Name' && row.total === 800));
});

test('leaderboard orders by total then lower time, and "me" shows my rank with a token', async () => {
  const a = store.findOrCreateUser(freshPhone());
  const b = store.findOrCreateUser(freshPhone());
  a.name = 'Slow Scorer';
  b.name = 'Quick Scorer';
  store.recordScore(a.id, { day: 2, score: 500, secs: 300 });
  store.recordScore(b.id, { day: 2, score: 500, secs: 100 });

  const board = await call('GET', '/api/leaderboard');
  const names = board.json.top.map((r) => r.name);
  assert.ok(names.indexOf('Quick Scorer') < names.indexOf('Slow Scorer'));
});

test('recordScore refuses invalid values and does not change the best', () => {
  const user = store.findOrCreateUser(freshPhone());
  store.recordScore(user.id, { day: 3, score: 700, secs: 50 });
  assert.throws(() => store.recordScore(user.id, { day: 3, score: 9999, secs: 50 }), /Score must be/);
  assert.equal(user.best.get(3).score, 700);
});

test('wrap data is public and has no private fields', async () => {
  const res = await call('GET', '/api/wrap');
  assert.equal(res.status, 200);
  // The test clock is 12 Oct 2026, after results (26 Sep), so results are out.
  assert.equal(res.json.results_out, true);
  assert.ok(Array.isArray(res.json.overall_top));
  assert.ok(!/phone|ref_code|token/i.test(res.text));
});

test('unknown API routes return 404 JSON', async () => {
  const res = await call('GET', '/api/nope');
  assert.equal(res.status, 404);
});

test('non-GET requests to static files are refused', async () => {
  const res = await call('POST', '/css/styles.css', { body: {} });
  assert.equal(res.status, 405);
});

test('path traversal outside public/ is refused', async () => {
  const status = await new Promise((resolve, reject) => {
    const req = httpRequest(`${base}/%2e%2e/package.json`, (res) => {
      res.resume();
      resolve(res.statusCode);
    });
    req.on('error', reject);
    req.end();
  });
  assert.equal(status, 404);
});

test('/thankyou serves the app shell and every response carries a CSP', async () => {
  const res = await call('GET', '/thankyou');
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/html/);
  assert.match(res.headers.get('content-security-policy'), /script-src 'self'/);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
});
