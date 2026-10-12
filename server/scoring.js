// Server-side scoring and ranking rules. The browser never decides a score, a total or a rank.

// INFERRED: referral bonus is 100 points for each side (Rules copy).
export const REFERRAL_BONUS = 100;

// INFERRED: up to 1000 points a day and 2000 on Day 10 (Rules copy). Exact per-game maxima are unverified.
export function maxDayPoints(day) {
  return day === 10 ? 2000 : 1000;
}

// PROPOSED: upper bound on a single day's recorded time (one day in seconds).
export const MAX_SECONDS = 24 * 60 * 60;

export class ScoreError extends Error {}

// Validates a score submission before it is stored. Rejects anything that is not a whole number in range.
export function validateScore({ day, score, secs }) {
  if (!Number.isInteger(day) || day < 1 || day > 10) {
    throw new ScoreError('Day must be a whole number from 1 to 10.');
  }
  if (!Number.isInteger(score) || score < 0 || score > maxDayPoints(day)) {
    throw new ScoreError(`Score must be a whole number from 0 to ${maxDayPoints(day)}.`);
  }
  if (!Number.isInteger(secs) || secs < 0 || secs > MAX_SECONDS) {
    throw new ScoreError(`Time must be a whole number of seconds from 0 to ${MAX_SECONDS}.`);
  }
  return { day, score, secs };
}

// True when attempt `a` should replace the stored best `b` for the same day.
// Higher score wins; on equal score the lower time wins (INFERRED: "the faster player wins a tie").
export function isBetterAttempt(a, b) {
  if (!b) return true;
  if (a.score !== b.score) return a.score > b.score;
  return a.secs < b.secs;
}

// Competition ranking over an already-sorted list: equal entries share a rank and the next rank skips.
// `compare` returns 0 for entries that tie.
export function competitionRank(sorted, compare) {
  let rank = 0;
  return sorted.map((item, i) => {
    if (i === 0 || compare(sorted[i - 1], item) !== 0) rank = i + 1;
    return { rank, item };
  });
}

// Overall order: total points (game + referral) high to low, then total time low to high.
export function compareOverall(a, b) {
  return b.total - a.total || a.secs - b.secs;
}

export function compareGame(a, b) {
  return b.gamePoints - a.gamePoints || a.secs - b.secs;
}

export function compareReferral(a, b) {
  return b.refBonus - a.refBonus;
}

// PLACEHOLDER game (NEEDS_CONFIRMATION.md, decision 2). Not the reference's game mechanics.
export const PLACEHOLDER_SHAPES = Object.freeze(['circle', 'square', 'triangle', 'star']);
export const ROUNDS = 10;

// Each correct round is worth an equal share of the day maximum, so a perfect day equals maxDayPoints(day).
export function pointsPerRound(day) {
  return maxDayPoints(day) / ROUNDS;
}

// `rounds` is the server-side list of { target, options }. Answers are checked against it, never trusted as scores.
export function scoreAnswers(day, rounds, answers) {
  if (!Array.isArray(answers) || answers.length !== ROUNDS) {
    throw new ScoreError(`Send exactly ${ROUNDS} answers.`);
  }
  let correct = 0;
  answers.forEach((answer, i) => {
    if (!PLACEHOLDER_SHAPES.includes(answer) || !rounds[i].options.includes(answer)) {
      throw new ScoreError('Each answer must be one of the shapes offered in that round.');
    }
    if (answer === rounds[i].target) correct += 1;
  });
  return { score: correct * pointsPerRound(day), correct };
}
