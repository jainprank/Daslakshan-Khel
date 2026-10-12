// Placeholder game flow: one try per day, server-side scoring, window checks. Runs on a clock inside Day 5's window.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../server/app.js';
import { createStore } from '../server/store.js';
import { scoreAnswers, PLACEHOLDER_SHAPES, pointsPerRound } from '../server/scoring.js';

const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const silent = { log() {}, error() {} };
// 20 Sep 2026 10:00 IST: day 5 is open, day 4 is closed, day 6 is upcoming.
const clock = { value: new Date('2026-09-20T10:00:00+05:30') };
const now = () => clock.value;
const delivered = [];
const store = createStore({ now, pepper: 'test-pepper' });
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

let phoneCounter = 8000000000;
async function login(name) {
  phoneCounter += 1;
  const phone = String(phoneCounter);
  await call('POST', '/api/auth/send-otp', { body: { phone } });
  const code = delivered.filter((d) => d.phone === phone).at(-1).code;
  const verified = await call('POST', '/api/auth/verify-otp', { body: { phone, code } });
  await call('PATCH', '/api/me', { token: verified.json.token, body: { name } });
  return verified.json.token;
}

test('a day that has not opened or has closed cannot be started', async () => {
  const token = await login('Early Bird');
  const upcoming = await call('POST', '/api/day/6/start', { token, body: {} });
  assert.equal(upcoming.status, 400);
  assert.equal(upcoming.json.detail, "This day's game has not opened yet.");
  const closed = await call('POST', '/api/day/4/start', { token, body: {} });
  assert.equal(closed.json.detail, "This day's game has closed.");
});

test('starting a game needs login', async () => {
  const res = await call('POST', '/api/day/5/start', { body: {} });
  assert.equal(res.status, 401);
});

test('start returns ten rounds of prompts and options, and never the server-side answers', async () => {
  const token = await login('Shape Player');
  const res = await call('POST', '/api/day/5/start', { token, body: {} });
  assert.equal(res.status, 200);
  assert.equal(res.json.rounds.length, 10);
  for (const round of res.json.rounds) {
    assert.ok(PLACEHOLDER_SHAPES.includes(round.prompt));
    assert.deepEqual([...round.options].sort(), [...PLACEHOLDER_SHAPES].sort());
  }
  assert.equal(Object.keys(res.json).includes('answers'), false);
});

test('one try per day: a second start is refused, even after a reload', async () => {
  const token = await login('Once Only');
  assert.equal((await call('POST', '/api/day/5/start', { token, body: {} })).status, 200);
  const again = await call('POST', '/api/day/5/start', { token, body: {} });
  assert.equal(again.status, 409);
  assert.equal(again.json.detail, 'You have already used your try for this day.');
});

test('submitting every answer correctly scores the day maximum, and the server records it', async () => {
  const token = await login('Perfect Score');
  const started = await call('POST', '/api/day/5/start', { token, body: {} });
  const answers = started.json.rounds.map((r) => r.prompt);
  const res = await call('POST', '/api/day/5/submit', { token, body: { attempt_id: started.json.attempt_id, answers } });
  assert.equal(res.status, 200);
  assert.equal(res.json.correct, 10);
  assert.equal(res.json.score, 1000);
  assert.equal(res.json.rounds.every((r) => r.correct), true);

  const me = await call('GET', '/api/me', { token });
  assert.equal(me.json.best['5'].score, 1000);
  assert.equal(me.json.tries['5'], 'submitted');
});

test('a score the client sends is ignored: only answers count', async () => {
  const token = await login('Cheater');
  const started = await call('POST', '/api/day/5/start', { token, body: {} });
  const wrong = started.json.rounds.map((r) => r.options.find((o) => o !== r.prompt));
  const res = await call('POST', '/api/day/5/submit', {
    token,
    body: { attempt_id: started.json.attempt_id, answers: wrong, score: 1000, secs: 0 },
  });
  assert.equal(res.json.score, 0);
  assert.equal(res.json.correct, 0);
});

test('a submission with a bad length, a bad shape or an unknown attempt is refused', async () => {
  const token = await login('Validator');
  const started = await call('POST', '/api/day/5/start', { token, body: {} });
  const id = started.json.attempt_id;
  const short = await call('POST', '/api/day/5/submit', { token, body: { attempt_id: id, answers: ['circle'] } });
  assert.equal(short.status, 400);
  assert.equal(short.json.detail, 'Send exactly 10 answers.');

  const badShape = await call('POST', '/api/day/5/submit', {
    token,
    body: { attempt_id: id, answers: Array(10).fill('dragon') },
  });
  assert.equal(badShape.status, 400);

  const unknown = await call('POST', '/api/day/5/submit', {
    token,
    body: { attempt_id: 'not-my-attempt', answers: Array(10).fill('circle') },
  });
  assert.equal(unknown.status, 400);
  assert.equal(unknown.json.detail, 'No game is in progress for this day.');
});

test('a submitted try cannot be submitted again', async () => {
  const token = await login('Double Submit');
  const started = await call('POST', '/api/day/5/start', { token, body: {} });
  const answers = started.json.rounds.map((r) => r.prompt);
  const body = { attempt_id: started.json.attempt_id, answers };
  assert.equal((await call('POST', '/api/day/5/submit', { token, body })).status, 200);
  const replay = await call('POST', '/api/day/5/submit', { token, body });
  assert.equal(replay.status, 409);
});

test('the score appears on the leaderboard and in the wrap data after submission', async () => {
  const token = await login('Board Player');
  const started = await call('POST', '/api/day/5/start', { token, body: {} });
  const answers = started.json.rounds.map((r) => r.prompt);
  await call('POST', '/api/day/5/submit', { token, body: { attempt_id: started.json.attempt_id, answers } });
  const board = await call('GET', '/api/leaderboard');
  assert.ok(board.json.top.some((row) => row.name === 'Board Player' && row.total === 1000));
  assert.ok(board.json.days[4].top.some((row) => row.name === 'Board Player' && row.score === 1000));
});

test('an abandoned try (started, never submitted) is spent and scores nothing', async () => {
  const token = await login('Abandoner');
  await call('POST', '/api/day/5/start', { token, body: {} });
  const me = await call('GET', '/api/me', { token });
  assert.equal(me.json.tries['5'], 'started');
  assert.equal(me.json.best['5'], undefined);
});

test('scoreAnswers: day 10 is worth 200 per round, other days 100', () => {
  assert.equal(pointsPerRound(5), 100);
  assert.equal(pointsPerRound(10), 200);
  const rounds = Array.from({ length: 10 }, () => ({ target: 'star', options: [...PLACEHOLDER_SHAPES] }));
  assert.equal(scoreAnswers(10, rounds, Array(10).fill('star')).score, 2000);
  assert.equal(scoreAnswers(5, rounds, Array(5).fill('star').concat(Array(5).fill('circle'))).score, 500);
});
