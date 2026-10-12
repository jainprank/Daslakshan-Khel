// HTTP handler: JSON API under /api/* and static files from public/.
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { buildConfig, dayState } from './schedule.js';
import { createStore, HttpError } from './store.js';
import { ScoreError } from './scoring.js';

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' https://fonts.googleapis.com",
    "font-src https://fonts.gstatic.com",
    "img-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'self'",
  ].join('; '),
};

// PROPOSED limits, to be confirmed.
const MAX_BODY_BYTES = 4 * 1024;
const IP_AUTH_LIMIT = 30;
const IP_AUTH_WINDOW_MS = 10 * 60 * 1000;

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new HttpError(413, 'Request is too large.');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    throw new HttpError(400, 'Request must be valid JSON.');
  }
}

function bearerToken(req) {
  const header = req.headers.authorization || '';
  const match = /^Bearer\s+(\S+)$/.exec(header);
  return match ? match[1] : null;
}

// Normalises an Indian mobile number entered as 10 digits, starting with 6-9.
function cleanPhone(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

export function createApp({
  publicDir,
  now = () => new Date(),
  store = createStore({ now }),
  logger = console,
  deliverOtp = (phone, code) => logger.log(`[demo] OTP for mobile ending ${phone.slice(-4)}: ${code}`),
  authLimitPerIp = IP_AUTH_LIMIT,
}) {
  function requireUser(req) {
    const user = store.userFromToken(bearerToken(req));
    if (!user) throw new HttpError(401, 'Please log in again.');
    return user;
  }

  function authRateLimit(req) {
    const ip = req.socket.remoteAddress || 'unknown';
    if (!store.allow(`ip-auth:${ip}`, authLimitPerIp, IP_AUTH_WINDOW_MS)) {
      throw new HttpError(429, 'Too many attempts from this network. Try again in a few minutes.');
    }
  }

  // One try per day: /api/day/:day/start spends it, /api/day/:day/submit scores it on the server.
  async function handleDay(req, res, day, action) {
    const user = requireUser(req);
    if (!Number.isInteger(day) || day < 1 || day > 10) throw new HttpError(404, 'No game on that day.');
    const body = await readJson(req);
    const state = dayState(day, now());
    if (state === 'upcoming') throw new HttpError(400, "This day's game has not opened yet.");
    if (state === 'closed') throw new HttpError(400, "This day's game has closed.");
    try {
      if (action === 'start') {
        const attempt = store.startAttempt(user.id, day);
        return sendJson(res, 200, {
          attempt_id: attempt.id,
          day,
          started_at: new Date(attempt.startedAt).toISOString(),
          rounds: attempt.rounds.map((round) => ({ prompt: round.target, options: round.options })),
        });
      }
      const result = store.submitAttempt(user.id, day, String(body.attempt_id ?? ''), body.answers);
      return sendJson(res, 200, result);
    } catch (err) {
      if (err instanceof ScoreError) throw new HttpError(400, err.message);
      throw err;
    }
  }

  async function handleApi(req, res, url) {
    const dayMatch = /^\/api\/day\/(\d{1,2})\/(start|submit)$/.exec(url.pathname);
    if (dayMatch && req.method === 'POST') return handleDay(req, res, Number(dayMatch[1]), dayMatch[2]);
    const route = `${req.method} ${url.pathname}`;
    switch (route) {
      case 'GET /api/config':
        return sendJson(res, 200, buildConfig(now()));

      case 'GET /api/wrap':
        return sendJson(res, 200, { now: now().toISOString(), ...store.wrapData(), ...wrapFlags() });

      case 'GET /api/leaderboard': {
        const viewer = store.userFromToken(bearerToken(req));
        return sendJson(res, 200, store.leaderboard(viewer ? viewer.id : null));
      }

      case 'POST /api/auth/send-otp': {
        authRateLimit(req);
        const body = await readJson(req);
        const phone = cleanPhone(body.phone);
        if (!phone) throw new HttpError(400, 'Enter a 10-digit mobile number.');
        const sent = store.requestOtp(phone, (code) => deliverOtp(phone, code));
        if (!sent) throw new HttpError(429, 'Too many OTP requests for this number. Try again in a few minutes.');
        return sendJson(res, 200, { ok: true, expires_in: 300 });
      }

      case 'POST /api/auth/verify-otp': {
        authRateLimit(req);
        const body = await readJson(req);
        const phone = cleanPhone(body.phone);
        const code = String(body.code ?? '').replace(/\D/g, '');
        if (!phone) throw new HttpError(400, 'Enter a 10-digit mobile number.');
        if (code.length !== 6) throw new HttpError(400, 'Enter the 6-digit OTP.');
        const result = store.checkOtp(phone, code);
        if (result === 'wrong') throw new HttpError(400, 'That OTP is not correct.');
        if (result === 'expired') throw new HttpError(400, 'That OTP has expired. Request a new one.');
        const user = store.findOrCreateUser(phone);
        const token = store.createSession(user.id);
        return sendJson(res, 200, { token, user: store.ownProfile(user) });
      }

      case 'GET /api/me': {
        const user = requireUser(req);
        return sendJson(res, 200, store.ownProfile(user));
      }

      case 'PATCH /api/me': {
        const user = requireUser(req);
        const body = await readJson(req);
        try {
          store.updateProfile(user.id, body);
        } catch (err) {
          if (err instanceof ScoreError) throw new HttpError(400, err.message);
          throw err;
        }
        return sendJson(res, 200, store.ownProfile(user));
      }

      default:
        return sendJson(res, 404, { detail: 'Not found.' });
    }
  }

  function wrapFlags() {
    const config = buildConfig(now());
    return { wrap_active: config.wrap_active, results_out: config.results_out, results_at: config.results_at };
  }

  async function serveStatic(res, pathname, method) {
    const relative = pathname === '/' || pathname === '/thankyou' ? '/index.html' : decodeURIComponent(pathname);
    const filePath = normalize(join(publicDir, relative));
    if (!filePath.startsWith(publicDir + sep)) {
      return sendJson(res, 404, { detail: 'Not found.' });
    }
    try {
      const body = await readFile(filePath);
      const type = CONTENT_TYPES[extname(filePath).toLowerCase()] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
      res.end(method === 'HEAD' ? undefined : body);
    } catch {
      sendJson(res, 404, { detail: 'Not found.' });
    }
  }

  return async function handle(req, res) {
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) res.setHeader(name, value);
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
      if (req.method !== 'GET' && req.method !== 'HEAD') return sendJson(res, 405, { detail: 'Method not allowed.' });
      return await serveStatic(res, url.pathname, req.method);
    } catch (err) {
      if (err instanceof HttpError) return sendJson(res, err.status, { detail: err.detail });
      if (err instanceof URIError) return sendJson(res, 400, { detail: 'Bad request.' });
      logger.error(err);
      return sendJson(res, 500, { detail: 'Something went wrong. Please try again.' });
    }
  };
}
