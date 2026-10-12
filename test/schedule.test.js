import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildConfig, dayState, dayWindow, CONTEST } from '../server/schedule.js';

test('day 1 opens 16 Sep 2026 00:00 IST and day 10 closes 25 Sep 23:59 IST', () => {
  assert.equal(dayWindow(1).opensAt.toISOString(), '2026-09-15T18:30:00.000Z');
  assert.equal(dayWindow(10).closesAt.toISOString(), '2026-09-25T18:29:00.000Z');
});

test('day state changes at the window edges', () => {
  const before = new Date('2026-09-15T23:59:59+05:30');
  const open = new Date('2026-09-16T00:00:00+05:30');
  const closed = new Date('2026-09-16T23:59:00+05:30');
  assert.equal(dayState(1, before), 'upcoming');
  assert.equal(dayState(1, open), 'open');
  assert.equal(dayState(1, closed), 'closed');
});

test('wrap goes live at 25 Sep 6 PM IST, results at 26 Sep 00:00 IST', () => {
  const justBefore = buildConfig(new Date('2026-09-25T17:59:59+05:30'));
  const live = buildConfig(new Date(CONTEST.wrapAt));
  assert.equal(justBefore.wrap_active, false);
  assert.equal(live.wrap_active, true);
  assert.equal(live.results_out, false);
  assert.equal(buildConfig(new Date(CONTEST.resultsAt)).results_out, true);
});

test('config lists ten day games with verified titles and one try per day', () => {
  const config = buildConfig(new Date('2026-10-12T10:00:00+05:30'));
  assert.equal(config.days.length, 10);
  assert.equal(config.days[0].title, 'Memory of symbols');
  assert.equal(config.days[9].title, 'Dharma Setu + Chhupa Lanchhan');
  assert.ok(config.days.every((d) => d.state === 'closed'));
  assert.equal(config.attempts_per_day, 1);
});
