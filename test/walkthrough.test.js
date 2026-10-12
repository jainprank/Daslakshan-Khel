// Day-by-day walkthrough of the placeholder game, Day 1 to Day 10, on one account.
// For each day: refused before opening, played inside the window, refused after closing, scored on the server.
// Day 1-9: 7 of 10 rounds correct = 700 points. Day 10: all 10 correct = 2000 points (max).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../server/app.js';
import { createStore } from '../server/store.js';
import { DAYS } from '../public/js/content.js';
import { buildConfig } from '../server/schedule.js';

const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const silent = { log() {}, error() {} };
const clock = { value: new Date('2026-09-15T12:00:00+05:30') };
const now = () => clock.value;
const delivered = [];
const store = createStore({ now, pepper: 'walkthrough-pepper' });
const server = createServer(
  createApp({
    publicDir,
    now,
    store,
    logger: silent,
    deliverOtp: (phone, code) => delivered.push({ phone, code }),
    authLimitPerIp: 10_000,
  }),
);
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
  return { status: res.status, json: text ? JSON.parse(text) : null };
}

// Day d's window in IST: opens 00:00 on 15+d September 2026, closes 23:59.
const ist = (day, hhmmss) => new Date(`2026-09-${String(15 + day).padStart(2, '0')}T${hhmmss}+05:30`);
const previousDayNoon = (day) => ist(day - 1, '12:00:00');

let token;
let expectedTotal = 0;

test('setup: one account logs in and sets a name before Day 1', async () => {
  const phone = '9500000001';
  await call('POST', '/api/auth/send-otp', { body: { phone } });
  const code = delivered.filter((d) => d.phone === phone).at(-1).code;
  const verified = await call('POST', '/api/auth/verify-otp', { body: { phone, code } });
  token = verified.json.token;
  const named = await call('PATCH', '/api/me', { token, body: { name: 'Walkthrough Player' } });
  assert.equal(named.status, 200);
});

for (const { day, dharma, title } of DAYS) {
  test(`Day ${day} · ${dharma} · ${title}: refused before, played, refused after`, async () => {
    // Before opening: the previous day is live, so Day N is upcoming.
    clock.value = previousDayNoon(day);
    const config = buildConfig(now());
    assert.equal(config.days[day - 1].state, 'upcoming');
    const early = await call('POST', `/api/day/${day}/start`, { token, body: {} });
    assert.equal(early.status, 400);
    assert.equal(early.json.detail, "This day's game has not opened yet.");

    // Inside the window (10:00 IST): the day is open and can be played once.
    clock.value = ist(day, '10:00:00');
    assert.equal(buildConfig(now()).days[day - 1].state, 'open');
    const started = await call('POST', `/api/day/${day}/start`, { token, body: {} });
    assert.equal(started.status, 200, JSON.stringify(started.json));
    assert.equal(started.json.rounds.length, 10);

    const perfect = day === 10;
    const answers = started.json.rounds.map((round, i) => {
      const correct = perfect || i < 7;
      return correct ? round.prompt : round.options.find((o) => o !== round.prompt);
    });
    const submitted = await call('POST', `/api/day/${day}/submit`, {
      token,
      body: { attempt_id: started.json.attempt_id, answers },
    });
    assert.equal(submitted.status, 200, JSON.stringify(submitted.json));
    const expected = perfect ? 2000 : 700;
    assert.equal(submitted.json.score, expected);
    assert.equal(submitted.json.correct, perfect ? 10 : 7);
    expectedTotal += expected;

    // A second try is refused the same day.
    const again = await call('POST', `/api/day/${day}/start`, { token, body: {} });
    assert.equal(again.status, 409);

    // After closing (23:59:30 IST): even an unused day would be refused.
    clock.value = ist(day, '23:59:30');
    assert.equal(buildConfig(now()).days[day - 1].state, 'closed');
    const late = await call('POST', `/api/day/${day}/start`, { token, body: {} });
    assert.equal(late.status, 400);
    assert.equal(late.json.detail, "This day's game has closed.");
  });
}

test('after all ten days: running total, daily leaderboard and Journey agree', async () => {
  clock.value = ist(10, '23:59:59');
  const me = await call('GET', '/api/me', { token });
  assert.equal(me.json.total, expectedTotal);
  assert.equal(expectedTotal, 9 * 700 + 2000);
  assert.equal(Object.keys(me.json.best).length, 10);
  for (let day = 1; day <= 10; day += 1) {
    assert.equal(me.json.tries[String(day)], 'submitted', `Day ${day} try`);
  }

  const board = await call('GET', '/api/leaderboard');
  const mine = board.json.top.find((row) => row.name === 'Walkthrough Player');
  assert.equal(mine.total, expectedTotal);
  for (let day = 1; day <= 10; day += 1) {
    const dayRows = board.json.days[day - 1].top;
    assert.equal(dayRows[0].name, 'Walkthrough Player', `Day ${day} daily top`);
    assert.equal(dayRows[0].score, day === 10 ? 2000 : 700);
  }
});
