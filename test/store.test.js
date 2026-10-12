import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore, HttpError } from '../server/store.js';

const fixed = () => new Date('2026-09-20T10:00:00+05:30');

test('DK_DEMO_OTP-style code logs in only after a code was requested for that number', () => {
  const store = createStore({ now: fixed, pepper: 'p', demoOtp: '123456' });
  assert.equal(store.checkOtp('9876543210', '123456'), 'expired', 'no request yet, so no login');
  store.requestOtp('9876543210', () => {});
  assert.equal(store.checkOtp('9876543210', '123456'), 'ok');
});

test('without a demo code configured, only the delivered code works', () => {
  const store = createStore({ now: fixed, pepper: 'p' });
  let sent = '';
  store.requestOtp('9876543210', (code) => {
    sent = code;
  });
  const wrong = sent === '000000' ? '111111' : '000000';
  assert.equal(store.checkOtp('9876543210', wrong), 'wrong');
  assert.equal(store.checkOtp('9876543210', sent), 'ok');
});

test('a second try on the same day is refused by the store', () => {
  const store = createStore({ now: fixed, pepper: 'p' });
  const user = store.findOrCreateUser('9000000001');
  store.startAttempt(user.id, 3);
  assert.throws(() => store.startAttempt(user.id, 3), (err) => err instanceof HttpError && err.status === 409);
});

test('profile names reject markup and empty values', () => {
  const store = createStore({ now: fixed, pepper: 'p' });
  const user = store.findOrCreateUser('9000000002');
  assert.throws(() => store.updateProfile(user.id, { name: '  ' }), /Enter your name/);
  assert.throws(() => store.updateProfile(user.id, { name: 'a<b' }), /cannot contain/);
  store.updateProfile(user.id, { name: 'Good Name' });
  assert.equal(user.name, 'Good Name');
});
