// In-memory demo store. Data is lost on restart and is NOT production-secure (see README.md, "Demo limits").
// Phone numbers are never stored in plaintext: only a keyed HMAC is kept, so a leaked store does not list numbers.
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import {
  REFERRAL_BONUS,
  ScoreError,
  validateScore,
  isBetterAttempt,
  competitionRank,
  compareOverall,
  compareGame,
  compareReferral,
  PLACEHOLDER_SHAPES,
  ROUNDS,
  MAX_SECONDS,
  scoreAnswers,
} from './scoring.js';
import { DAYS } from '../public/js/content.js';

export class HttpError extends Error {
  constructor(status, detail) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

// PROPOSED values, to be confirmed by the owner (see NEEDS_CONFIRMATION.md).
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_MAX_WRONG_TRIES = 5;
const OTP_SENDS_PER_WINDOW = 3;
const OTP_SEND_WINDOW_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const NAME_MAX = 40;
// INFERRED: the reference leaderboard shows a "Top 50" list.
const LEADERBOARD_SIZE = 50;
// Referral codes avoid 0, O, 1 and I so they are easy to read aloud.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function createStore({
  now = () => new Date(),
  pepper = randomBytes(32).toString('hex'),
  demoOtp = null,
} = {}) {
  const users = new Map(); // id -> internal user record. Never serialised as-is.
  const userIdByPhoneKey = new Map();
  const userIdByRefCode = new Map();
  const sessions = new Map(); // sha256(token) -> { userId, expiresAt }
  const otps = new Map(); // phone key -> { codeHash, expiresAt, wrongLeft }
  const hits = new Map(); // rate-limit key -> [timestamps]

  const hmac = (value) => createHmac('sha256', pepper).update(value).digest('hex');
  const digest = (value) => createHash('sha256').update(value).digest('hex');
  const nowMs = () => now().getTime();
  const safeEqual = (a, b) => {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    return left.length === right.length && timingSafeEqual(left, right);
  };

  function allow(key, limit, windowMs) {
    const t = nowMs();
    const recent = (hits.get(key) || []).filter((stamp) => t - stamp < windowMs);
    if (recent.length >= limit) {
      hits.set(key, recent);
      return false;
    }
    recent.push(t);
    hits.set(key, recent);
    return true;
  }

  function newReferralCode() {
    let code;
    do {
      code = Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');
    } while (userIdByRefCode.has(code));
    return code;
  }

  function findOrCreateUser(phone) {
    const phoneKey = hmac(`phone:${phone}`);
    const existingId = userIdByPhoneKey.get(phoneKey);
    if (existingId) return users.get(existingId);
    const user = {
      id: randomBytes(12).toString('hex'),
      name: '',
      refCode: newReferralCode(),
      referredBy: null,
      refCount: 0,
      refBonus: 0,
      best: new Map(), // day -> { score, secs }, submitted games only
      tries: new Map(), // day -> attempt record (one per day, see startAttempt)
      createdAt: nowMs(),
    };
    users.set(user.id, user);
    userIdByPhoneKey.set(phoneKey, user.id);
    userIdByRefCode.set(user.refCode, user.id);
    return user;
  }

  // Sends a one-time code through `deliver(code)`. The code is never returned to the caller of the HTTP API.
  function requestOtp(phone, deliver) {
    if (!allow(`otp-send:${phone}`, OTP_SENDS_PER_WINDOW, OTP_SEND_WINDOW_MS)) return false;
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    otps.set(hmac(`otp:${phone}`), {
      codeHash: hmac(`code:${phone}:${code}`),
      expiresAt: nowMs() + OTP_TTL_MS,
      wrongLeft: OTP_MAX_WRONG_TRIES,
    });
    deliver(code);
    return true;
  }

  // Returns 'ok', 'wrong' or 'expired'. A correct code is single-use.
  // `demoOtp` (set only via DK_DEMO_OTP, never in production) is accepted once a code has been requested.
  function checkOtp(phone, code) {
    const key = hmac(`otp:${phone}`);
    const entry = otps.get(key);
    if (!entry || nowMs() > entry.expiresAt) {
      otps.delete(key);
      return 'expired';
    }
    const isDemo = demoOtp !== null && code === demoOtp;
    if (isDemo || safeEqual(entry.codeHash, hmac(`code:${phone}:${code}`))) {
      otps.delete(key);
      return 'ok';
    }
    entry.wrongLeft -= 1;
    if (entry.wrongLeft <= 0) {
      otps.delete(key);
      return 'expired';
    }
    return 'wrong';
  }

  function createSession(userId) {
    const token = randomBytes(32).toString('base64url');
    sessions.set(digest(token), { userId, expiresAt: nowMs() + SESSION_TTL_MS });
    return token;
  }

  function userFromToken(token) {
    if (!token) return null;
    const key = digest(token);
    const session = sessions.get(key);
    if (!session) return null;
    if (nowMs() > session.expiresAt) {
      sessions.delete(key);
      return null;
    }
    return users.get(session.userId) || null;
  }

  function cleanName(value) {
    const text = String(value ?? '').trim();
    if (!text) throw new HttpError(400, 'Enter your name.');
    if (text.length > NAME_MAX || /[\u0000-\u001f\u007f<>]/.test(text)) {
      throw new HttpError(400, `Name can be up to ${NAME_MAX} characters and cannot contain < or >.`);
    }
    return text;
  }

  // Saves the display name. A referral code can be added once, before the first game, and gives both sides a bonus.
  function updateProfile(userId, { name, referral = '' }) {
    const user = users.get(userId);
    if (!user) throw new HttpError(401, 'Please log in again.');
    const nameText = cleanName(name);
    const code = String(referral ?? '').trim().toUpperCase();

    let referrer = null;
    if (code) {
      if (!/^[A-Z0-9]{6}$/.test(code)) throw new HttpError(400, 'Referral codes are 6 letters or digits.');
      if (user.referredBy) throw new HttpError(400, 'A referral code is already applied to this account.');
      if (user.tries.size > 0) throw new HttpError(400, 'Referral codes can only be added before your first game.');
      const referrerId = userIdByRefCode.get(code);
      if (!referrerId) throw new HttpError(400, 'That referral code was not found.');
      if (referrerId === userId) throw new HttpError(400, 'You cannot use your own referral code.');
      referrer = users.get(referrerId);
    }

    user.name = nameText;
    if (referrer) {
      user.referredBy = referrer.id;
      user.refBonus += REFERRAL_BONUS;
      referrer.refCount += 1;
      referrer.refBonus += REFERRAL_BONUS;
    }
    return user;
  }

  // Starts the one try for a day. The try is spent here, so reloading or abandoning does not give it back.
  // The caller checks that the day is open. The server keeps the targets; they are returned to the client only as prompts.
  function startAttempt(userId, day) {
    const user = users.get(userId);
    if (!user) throw new HttpError(401, 'Please log in again.');
    if (user.tries.has(day)) throw new HttpError(409, 'You have already used your try for this day.');
    const rounds = Array.from({ length: ROUNDS }, () => {
      const target = PLACEHOLDER_SHAPES[randomInt(PLACEHOLDER_SHAPES.length)];
      return { target, options: shuffle([...PLACEHOLDER_SHAPES]) };
    });
    const attempt = {
      id: randomBytes(12).toString('hex'),
      day,
      startedAt: nowMs(),
      rounds,
      status: 'started',
    };
    user.tries.set(day, attempt);
    return attempt;
  }

  // Scores the answers on the server, records the best, and returns the result. The client's numbers are ignored.
  function submitAttempt(userId, day, attemptId, answers) {
    const user = users.get(userId);
    const attempt = user && user.tries.get(day);
    if (!attempt || attempt.id !== attemptId) throw new HttpError(400, 'No game is in progress for this day.');
    if (attempt.status !== 'started') throw new HttpError(409, 'This try has already been submitted.');
    const { score, correct } = scoreAnswers(day, attempt.rounds, answers);
    const secs = Math.min(MAX_SECONDS, Math.floor((nowMs() - attempt.startedAt) / 1000));
    recordScore(userId, { day, score, secs });
    attempt.status = 'submitted';
    return {
      score,
      correct,
      secs,
      rounds: attempt.rounds.map((round, i) => ({
        prompt: round.target,
        answer: answers[i],
        correct: answers[i] === round.target,
      })),
    };
  }

  // Server-side score recording (validated). Used by submitAttempt and by tests.
  function recordScore(userId, attempt) {
    const { day, score, secs } = validateScore(attempt);
    const user = users.get(userId);
    if (!user) throw new HttpError(401, 'Please log in again.');
    if (isBetterAttempt({ score, secs }, user.best.get(day))) {
      user.best.set(day, { score, secs });
    }
    return user.best.get(day);
  }

  function playerView(user) {
    let gamePoints = 0;
    let secs = 0;
    for (const attempt of user.best.values()) {
      gamePoints += attempt.score;
      secs += attempt.secs;
    }
    return {
      id: user.id,
      name: user.name,
      gamePoints,
      refBonus: user.refBonus,
      total: gamePoints + user.refBonus,
      secs,
      daysPlayed: user.best.size,
      refCount: user.refCount,
    };
  }

  const namedPlayers = () => [...users.values()].filter((u) => u.name).map(playerView);

  // Public-safe fields only: display name, points and rank. No id, phone, referral code or city.
  function leaderboard(viewerId) {
    const ranked = competitionRank(
      namedPlayers().filter((p) => p.total > 0).sort(compareOverall),
      compareOverall,
    );
    const top = ranked.slice(0, LEADERBOARD_SIZE).map(({ rank, item }) => ({
      rank,
      name: item.name,
      total: item.total,
    }));
    const viewer = viewerId ? users.get(viewerId) : null;
    let me = null;
    if (viewer) {
      const mine = playerView(viewer);
      const place = ranked.find((r) => r.item.id === viewerId);
      me = {
        rank: place ? place.rank : null,
        total: mine.total,
        days_played: mine.daysPlayed,
        secs_total: mine.secs,
      };
    }
    return { total_players: ranked.length, top, me, days: dailyTop(3), bonus: [] };
  }

  // Per-day leaderboard. Game points only; the faster player wins a tie.
  function dailyTop(limit) {
    return DAYS.map((d) => {
      const entries = [...users.values()]
        .filter((u) => u.name && u.best.has(d.day))
        .map((u) => ({ name: u.name, score: u.best.get(d.day).score, secs: u.best.get(d.day).secs }))
        .sort((a, b) => b.score - a.score || a.secs - b.secs);
      const ranked = competitionRank(entries, (a, b) => b.score - a.score || a.secs - b.secs).slice(0, limit);
      return {
        day: d.day,
        dharma: d.dharma,
        title: d.title,
        top: ranked.map(({ rank, item }) => ({ rank, name: item.name, score: item.score })),
      };
    });
  }

  function wrapData() {
    const players = namedPlayers();
    const overall = competitionRank(players.filter((p) => p.total > 0).sort(compareOverall), compareOverall)
      .slice(0, 3)
      .map(({ rank, item }) => ({ rank, name: item.name, total: item.total }));
    const gameTop = competitionRank(players.filter((p) => p.gamePoints > 0).sort(compareGame), compareGame)
      .slice(0, 3)
      .map(({ rank, item }) => ({ rank, name: item.name, points: item.gamePoints }));
    const referralTop = competitionRank(players.filter((p) => p.refBonus > 0).sort(compareReferral), compareReferral)
      .slice(0, 3)
      .map(({ rank, item }) => ({ rank, name: item.name, points: item.refBonus, count: item.refCount }));
    const dailyWinners = dailyTop(1).map((d) => ({
      day: d.day,
      dharma: d.dharma,
      title: d.title,
      winner: d.top[0] ? { name: d.top[0].name, score: d.top[0].score } : null,
    }));
    const totalSecs = players.reduce((sum, p) => sum + p.secs, 0);
    return {
      registrations: users.size,
      minutes_played: Math.floor(totalSecs / 60),
      overall_top: overall,
      daily_winners: dailyWinners,
      referral_top: referralTop,
      game_top: gameTop,
    };
  }

  // Own-account view for /api/me. Contains the user's own referral code; never shown to other players.
  function ownProfile(user) {
    const view = playerView(user);
    const best = {};
    for (const [day, attempt] of user.best) best[String(day)] = { ...attempt };
    const tries = {};
    for (const [day, attempt] of user.tries) tries[String(day)] = attempt.status;
    return {
      name: user.name,
      ref_code: user.refCode,
      referred_by: Boolean(user.referredBy),
      ref_count: user.refCount,
      ref_bonus: user.refBonus,
      total: view.total,
      secs_total: view.secs,
      best,
      tries,
    };
  }

  return {
    allow,
    requestOtp,
    checkOtp,
    findOrCreateUser,
    createSession,
    userFromToken,
    updateProfile,
    startAttempt,
    submitAttempt,
    recordScore,
    leaderboard,
    wrapData,
    ownProfile,
    get size() {
      return users.size;
    },
  };
}

function shuffle(items) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

export { ScoreError };
