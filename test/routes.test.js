import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveRoute } from '../public/js/routes.js';

const loggedOut = { loggedIn: false, hasName: false, wrapActive: false };
const loggedIn = { loggedIn: true, hasName: true, wrapActive: false };

test('logged-out visitors are sent to login for every app screen before the wrap', () => {
  for (const route of ['home', 'board', 'journey', 'rules', 'profile', 'auth']) {
    assert.equal(resolveRoute(route, loggedOut), 'auth', route);
  }
});

test('once the wrap is live, Home is public and logged out', () => {
  const wrap = { ...loggedOut, wrapActive: true };
  assert.equal(resolveRoute('home', wrap), 'home');
  assert.equal(resolveRoute('board', wrap), 'auth');
});

test('/thankyou is always public', () => {
  assert.equal(resolveRoute('thankyou', loggedOut), 'thankyou');
  assert.equal(resolveRoute('thankyou', loggedIn), 'thankyou');
});

test('a logged-in account without a name goes to the profile first', () => {
  const noName = { loggedIn: true, hasName: false, wrapActive: false };
  assert.equal(resolveRoute('board', noName), 'profile');
  assert.equal(resolveRoute('home', noName), 'profile');
});

test('logged-in navigation keeps the requested tab; auth goes home', () => {
  assert.equal(resolveRoute('board', loggedIn), 'board');
  assert.equal(resolveRoute('journey', loggedIn), 'journey');
  assert.equal(resolveRoute('rules', loggedIn), 'rules');
  assert.equal(resolveRoute('auth', loggedIn), 'home');
});

test('the placeholder game needs login and a name, like the other tabs', () => {
  assert.equal(resolveRoute('play', loggedIn), 'play');
  assert.equal(resolveRoute('play', loggedOut), 'auth');
  assert.equal(resolveRoute('play', { loggedIn: true, hasName: false, wrapActive: false }), 'profile');
});

test('unknown routes fall back to Home', () => {
  assert.equal(resolveRoute('does-not-exist', loggedIn), 'home');
  assert.equal(resolveRoute(undefined, loggedIn), 'home');
});
