import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateScore,
  maxDayPoints,
  isBetterAttempt,
  competitionRank,
  compareOverall,
  ScoreError,
  MAX_SECONDS,
} from '../server/scoring.js';

test('scores must be whole numbers within the day maximum', () => {
  assert.deepEqual(validateScore({ day: 1, score: 0, secs: 0 }), { day: 1, score: 0, secs: 0 });
  assert.deepEqual(validateScore({ day: 1, score: 1000, secs: 90 }), { day: 1, score: 1000, secs: 90 });
  assert.throws(() => validateScore({ day: 1, score: 1001, secs: 90 }), ScoreError);
  assert.throws(() => validateScore({ day: 1, score: -1, secs: 90 }), ScoreError);
  assert.throws(() => validateScore({ day: 1, score: 10.5, secs: 90 }), ScoreError);
  assert.throws(() => validateScore({ day: 1, score: '100', secs: 90 }), ScoreError);
});

test('day 10 allows up to 2000 points and other days up to 1000', () => {
  assert.equal(maxDayPoints(10), 2000);
  assert.equal(maxDayPoints(9), 1000);
  assert.deepEqual(validateScore({ day: 10, score: 2000, secs: 1 }).score, 2000);
  assert.throws(() => validateScore({ day: 10, score: 2001, secs: 1 }), ScoreError);
});

test('day and time must be in range', () => {
  assert.throws(() => validateScore({ day: 0, score: 1, secs: 1 }), ScoreError);
  assert.throws(() => validateScore({ day: 11, score: 1, secs: 1 }), ScoreError);
  assert.throws(() => validateScore({ day: 1, score: 1, secs: MAX_SECONDS + 1 }), ScoreError);
  assert.throws(() => validateScore({ day: 1, score: 1, secs: -5 }), ScoreError);
});

test('a better attempt replaces the best: higher score, then lower time', () => {
  assert.equal(isBetterAttempt({ score: 500, secs: 60 }, undefined), true);
  assert.equal(isBetterAttempt({ score: 600, secs: 90 }, { score: 500, secs: 60 }), true);
  assert.equal(isBetterAttempt({ score: 400, secs: 10 }, { score: 500, secs: 60 }), false);
  assert.equal(isBetterAttempt({ score: 500, secs: 50 }, { score: 500, secs: 60 }), true);
  assert.equal(isBetterAttempt({ score: 500, secs: 70 }, { score: 500, secs: 60 }), false);
});

test('competition ranking shares a rank on ties and skips the next rank', () => {
  const players = [
    { name: 'A', total: 300, secs: 10 },
    { name: 'B', total: 300, secs: 10 },
    { name: 'C', total: 200, secs: 5 },
  ].sort(compareOverall);
  const ranks = competitionRank(players, compareOverall).map((r) => [r.item.name, r.rank]);
  assert.deepEqual(ranks, [['A', 1], ['B', 1], ['C', 3]]);
});

test('equal totals are split by lower total time, not by name', () => {
  const players = [
    { name: 'Slow', total: 300, secs: 90 },
    { name: 'Fast', total: 300, secs: 40 },
  ].sort(compareOverall);
  assert.equal(players[0].name, 'Fast');
  const ranks = competitionRank(players, compareOverall).map((r) => r.rank);
  assert.deepEqual(ranks, [1, 2]);
});
