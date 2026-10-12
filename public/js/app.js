// Browser app: vanilla JS, no build step. Views render into #view. Content lives in content.js.
import { BRAND, WRAP, COPY, RULES, RULES_FOOTNOTE } from './content.js';
import { resolveRoute } from './routes.js';

const $ = (selector, root = document) => root.querySelector(selector);
const view = $('#view');
const tabs = $('#tabs');
const chip = $('#userChip');
const toastEl = $('#toast');

const TOKEN_KEY = 'dk_token';
const REF_KEY = 'dk_ref';
const IST = 'Asia/Kolkata';
const ROUND_COUNT = 10;

// localStorage can throw in private windows or when storage is blocked. Every access goes through these helpers.
function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeStorage(key, value) {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    /* storage unavailable: the session simply lasts for this page load */
  }
}

const state = {
  token: readStorage(TOKEN_KEY),
  user: null,
  config: null,
  seq: 0,
  pendingPhone: '',
  game: null, // { attemptId, day, rounds, index, answers } while a game is in progress
};

const esc = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hiLine = (text) => `<span class="hi-line">${esc(text)}</span>`;
const num = (n) => Number(n || 0).toLocaleString('en-IN');
const fmtSecs = (s) => {
  const total = Math.max(0, Math.round(s || 0));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};
const fmtIst = (iso) =>
  new Intl.DateTimeFormat('en-IN', { timeZone: IST, day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(iso));
const shapeLabel = (shape) => COPY.game.shapes[shape] || shape;
const CREST = '<img class="crest" src="/img/lotus.svg" alt="" width="96" height="96">';

function captureReferralCode() {
  try {
    const fromUrl = new URLSearchParams(location.search).get('ref');
    const code = (fromUrl || readStorage(REF_KEY) || '').toUpperCase();
    if (code) writeStorage(REF_KEY, code);
    return code;
  } catch {
    return '';
  }
}

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  let response;
  try {
    response = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError(COPY.states.networkError, 0);
  }
  let data = null;
  try {
    data = await response.json();
  } catch {
    /* non-JSON response */
  }
  if (response.status === 401 && state.token) {
    clearSession();
    throw new ApiError((data && data.detail) || 'Please log in again.', 401);
  }
  if (!response.ok) {
    const detail = data && typeof data.detail === 'string' ? data.detail : null;
    throw new ApiError(detail || 'Something went wrong. Please try again.', response.status);
  }
  return data;
}

function toast(message, ms = 2600) {
  toastEl.textContent = message;
  toastEl.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    toastEl.hidden = true;
  }, ms);
}

function clearSession() {
  state.token = null;
  state.user = null;
  state.game = null;
  writeStorage(TOKEN_KEY, null);
}

function logout() {
  clearSession();
  go('auth');
}

function currentDay(days) {
  return days.find((d) => d.state === 'open') || days.find((d) => d.state === 'upcoming') || days[days.length - 1];
}

function renderStatus(message, { retry } = {}) {
  view.innerHTML = `
    <section class="card" role="alert">
      <p class="err">${esc(message)}</p>
      ${retry ? `<button class="btn ghost" type="button" id="retry">${COPY.states.retry}</button>` : `<button class="btn ghost" type="button" data-nav="home">${COPY.game.back}</button>`}
    </section>`;
  if (retry) $('#retry').addEventListener('click', retry);
}

// ---------------------------------------------------------------- router ----
const renderers = {
  home: () => (state.config.wrap_active ? renderWrap() : renderToday()),
  thankyou: () => renderWrap(),
  auth: () => renderAuth(),
  profile: () => renderProfile(),
  play: () => renderPlay(),
  board: () => renderBoard(),
  journey: () => renderJourney(),
  rules: () => renderRules(),
};

async function go(requested, { focus = true } = {}) {
  const seq = ++state.seq;
  const route = resolveRoute(requested, {
    loggedIn: Boolean(state.user),
    hasName: Boolean(state.user && state.user.name),
    wrapActive: Boolean(state.config && state.config.wrap_active),
  });
  // Reference (INFERRED from source): logged-in players keep the tabs on the wrap; the start and profile screens have none.
  tabs.hidden = !state.user || route === 'auth' || route === 'profile' || route === 'play';
  tabs.querySelectorAll('button').forEach((b) => {
    if (b.dataset.nav === route) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
  chip.hidden = !state.user;
  if (state.user) chip.textContent = state.user.name || 'Profile';
  window.scrollTo(0, 0);
  view.innerHTML = `<p class="muted center" role="status">${COPY.states.loading}</p>`;
  try {
    await renderers[route]();
  } catch (err) {
    if (seq !== state.seq) return;
    renderStatus(err.message, { retry: () => go(route) });
  }
  if (seq === state.seq && focus) view.focus({ preventScroll: true });
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-nav]');
  if (!button) return;
  event.preventDefault();
  go(button.dataset.nav);
});
chip.addEventListener('click', () => go('profile'));

// -------------------------------------------------------------- wrap ----
// Public thank-you page. Shown on /thankyou always, and on Home once the wrap is live.
function resultsBlocks(w) {
  const rows = (items, valueOf) =>
    items.map((u) => `<li class="li"><span class="rk g r${u.rank}">${u.rank}</span><span class="nm">${esc(u.name)}</span><span class="pt">${num(valueOf(u))}</span></li>`).join('') ||
    '<li class="empty">No scores yet.</li>';
  return `
    <section class="list" aria-labelledby="wrap-overall">
      <h2 id="wrap-overall" class="sect">${WRAP.overall.title}<small>${WRAP.overall.note}</small></h2>
      <ol class="plain">${rows(w.overall_top, (u) => u.total)}</ol>
    </section>
    <section class="list" aria-labelledby="wrap-daily">
      <h2 id="wrap-daily" class="sect">${WRAP.daily.title}<small>${WRAP.daily.note}</small></h2>
      <ol class="plain">${w.daily_winners
        .map((d) => `<li class="li"><span class="rk">${d.day}</span><span class="nm">${d.winner ? esc(d.winner.name) : '<span class="muted">No winner</span>'}<small>Day ${d.day} · ${esc(d.dharma)} · ${esc(d.title)}</small></span><span class="pt">${d.winner ? num(d.winner.score) : '–'}</span></li>`)
        .join('')}</ol>
    </section>
    <section class="list" aria-labelledby="wrap-referral">
      <h2 id="wrap-referral" class="sect">${WRAP.referral.title}<small>${WRAP.referral.note}</small></h2>
      <ol class="plain">${w.referral_top
        .map((u) => `<li class="li"><span class="rk g r${u.rank}">${u.rank}</span><span class="nm">${esc(u.name)}<small>${u.count ? u.count + ' referrals' : ''}</small></span><span class="pt">${num(u.points)}</span></li>`)
        .join('') || '<li class="empty">No scores yet.</li>'}</ol>
    </section>
    <section class="list" aria-labelledby="wrap-game">
      <h2 id="wrap-game" class="sect">${WRAP.gameTop.title}<small>${WRAP.gameTop.note}</small></h2>
      <ol class="plain">${rows(w.game_top, (u) => u.points)}</ol>
    </section>`;
}

async function renderWrap() {
  const w = await api('/api/wrap');
  view.innerHTML = `
    <section class="card hero wrap" aria-labelledby="wrap-title">
      <div class="garland" aria-hidden="true"></div>
      ${CREST}
      <span class="eyebrow"><b>${WRAP.eyebrow}</b> · ${WRAP.dates}</span>
      <h1 id="wrap-title" tabindex="-1">${WRAP.heading}</h1>
      <span class="devline">${WRAP.headingHi}</span>
      ${w.results_out
        ? ''
        : `<section class="card champ" aria-labelledby="wrap-ended">
            <span class="eyebrow"><b>${WRAP.endedEyebrow}</b> · ${WRAP.endedEyebrowHi}</span>
            <h2 id="wrap-ended">${WRAP.endedHeading}</h2>
            <p class="muted">${WRAP.endedBody}</p>
            ${hiLine(WRAP.endedBodyHi)}
          </section>`}
      <p class="meaning">${WRAP.meaning}</p>
      <p class="meaning">${hiLine(WRAP.meaningHi)}</p>
      <div class="cta">${state.user
        ? `<button class="btn gold" type="button" data-nav="journey">${WRAP.ctaJourney}</button>`
        : `<button class="btn gold" type="button" data-nav="auth">${WRAP.ctaLogin}</button>`}</div>
    </section>
    <section class="stats" aria-label="Contest totals">
      <div class="stat"><span class="ic" aria-hidden="true">🙏</span><b class="num">${num(w.registrations)}</b><span>Registered · पंजीकृत</span></div>
      <div class="stat"><span class="ic" aria-hidden="true">⏳</span><b class="num">${num(w.minutes_played)}</b><span>Minutes played · मिनट खेले</span></div>
    </section>
    ${w.results_out ? resultsBlocks(w) : ''}
    <section class="quote">
      <p><b>${WRAP.quote.title}</b></p>
      <p class="muted">${WRAP.quote.body}</p>
    </section>
    <section class="card center" aria-labelledby="kshama">
      <h2 id="kshama">${WRAP.kshama.title}</h2>
      <p class="muted">${WRAP.kshama.body}</p>
      <p class="muted">${hiLine(WRAP.kshama.bodyHi)}</p>
    </section>`;
}

// ------------------------------------------------------------- today ----
async function renderToday() {
  const day = currentDay(state.config.days);
  const tryUsed = state.user.tries && state.user.tries[String(day.day)];
  const best = state.user.best && state.user.best[String(day.day)];
  let notice = '';
  let action = '';
  if (day.state === 'upcoming') {
    notice = COPY.today.upcoming(fmtIst(day.opens_at));
  } else if (day.state === 'closed') {
    notice = COPY.today.closed;
  } else if (tryUsed) {
    notice = `${COPY.today.used}${best ? ` ${COPY.game.scoreLabel}: ${num(best.score)}.` : ''}`;
  } else {
    action = `<button class="btn gold" type="button" data-nav="play">${COPY.today.start}</button>
      <p class="tiny">${COPY.today.startNote}</p>`;
  }
  view.innerHTML = `
    <section class="card">
      <span class="eyebrow">${COPY.today.eyebrow} · Day ${day.day}</span>
      <h1 tabindex="-1">${esc(day.dharma)}</h1>
      <p class="muted">${esc(day.title)}</p>
      ${notice ? `<p class="notice">${esc(notice)}</p>` : ''}
      ${action}
      <p class="tiny">${COPY.today.placeholder}</p>
    </section>`;
}

// -------------------------------------------------------------- game ----
// PLACEHOLDER game: ten rounds of "tap the shape named". Targets come from the server. Answers are scored on the server.
async function renderPlay() {
  const day = currentDay(state.config.days);
  const tryUsed = state.user.tries && state.user.tries[String(day.day)];
  if (day.state !== 'open' || tryUsed) return renderToday();
  view.innerHTML = `
    <section class="card game">
      <span class="eyebrow">Day ${day.day} · ${esc(day.dharma)}</span>
      <h1 tabindex="-1">${esc(day.title)}</h1>
      <p class="notice">${COPY.game.placeholderNote}</p>
      <p class="muted">${COPY.today.startNote}</p>
      <button class="btn gold" id="startGame" type="button">${COPY.game.start}</button>
      <p class="err" id="gameErr" role="alert"></p>
    </section>`;
  $('#startGame').addEventListener('click', startGame);
}

async function startGame() {
  const button = $('#startGame');
  button.disabled = true;
  const day = currentDay(state.config.days);
  try {
    const started = await api(`/api/day/${day.day}/start`, { method: 'POST', body: {} });
    state.game = { attemptId: started.attempt_id, day, rounds: started.rounds, index: 0, answers: [] };
    renderRound();
  } catch (e) {
    $('#gameErr').textContent = e.message;
    button.disabled = false;
  }
}

function renderRound() {
  const game = state.game;
  const round = game.rounds[game.index];
  view.innerHTML = `
    <section class="card game" aria-labelledby="gameTitle">
      <span class="eyebrow">${COPY.game.round(game.index + 1, game.rounds.length)}</span>
      <h1 id="gameTitle" tabindex="-1">${COPY.game.prompt} ${esc(shapeLabel(round.prompt))}</h1>
      <div class="options" role="group" aria-labelledby="gameTitle">
        ${round.options.map((shape) => `<button class="btn ghost option" type="button" data-shape="${esc(shape)}">${esc(shapeLabel(shape))}</button>`).join('')}
      </div>
    </section>`;
  view.querySelectorAll('[data-shape]').forEach((b) => b.addEventListener('click', () => answer(b.dataset.shape)));
  $('#gameTitle').focus();
}

async function answer(shape) {
  const game = state.game;
  game.answers.push(shape);
  game.index += 1;
  if (game.index < game.rounds.length) return renderRound();
  view.innerHTML = `<section class="card"><p class="muted center" role="status">${COPY.game.done}</p></section>`;
  try {
    const result = await api(`/api/day/${game.day.day}/submit`, {
      method: 'POST',
      body: { attempt_id: game.attemptId, answers: game.answers },
    });
    state.game = null;
    renderResult(game.day, result);
    state.user = await api('/api/me').catch(() => state.user);
  } catch (e) {
    state.game = null;
    renderStatus(e.message);
  }
}

function renderResult(day, result) {
  view.innerHTML = `
    <section class="card hero">
      <span class="eyebrow">Day ${day.day} · ${esc(day.dharma)}</span>
      <h1 tabindex="-1">${num(result.score)}<span class="rank-label"> ${COPY.game.scoreLabel}</span></h1>
      <div class="stats">
        <div class="stat"><b class="num">${result.correct} / ${ROUND_COUNT}</b><span>${COPY.game.correctLabel}</span></div>
        <div class="stat"><b class="num">${fmtSecs(result.secs)}</b><span>${COPY.game.timeLabel}</span></div>
      </div>
      <button class="btn gold" type="button" data-nav="home">${COPY.game.back}</button>
      <button class="btn ghost" type="button" data-nav="journey">${COPY.game.journey}</button>
    </section>`;
}

// -------------------------------------------------------------- auth ----
function renderAuth() {
  view.innerHTML = `
    <section class="card hero">
      ${CREST}
      <h1 tabindex="-1">Daslakshan Khel</h1>
      <span class="devline">${BRAND.tagline}</span>
      <p class="meaning">${COPY.authHero.intro}</p>
    </section>
    <section class="card" id="authCard" aria-labelledby="welcome">
      <h2 id="welcome" class="center">${COPY.auth.welcome}</h2>
      <p class="muted center">${COPY.auth.intro}</p>
      <form id="phoneForm" novalidate>
        <div class="field">
          <label for="phone">${COPY.auth.phoneLabel}</label>
          <div class="prefix"><span aria-hidden="true">${COPY.auth.phonePrefix}</span><input id="phone" name="phone" inputmode="numeric" autocomplete="tel-national" maxlength="10" placeholder="98765 43210" required></div>
        </div>
        <button class="btn" id="sendOtp" type="submit">${COPY.auth.sendOtp}</button>
        <p class="err" id="authErr" role="alert"></p>
      </form>
      <p class="tiny">${COPY.auth.privacy}</p>
    </section>`;
  const phone = $('#phone');
  phone.value = state.pendingPhone;
  $('#phoneForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const err = $('#authErr');
    err.textContent = '';
    const digits = phone.value.replace(/\D/g, '');
    if (digits.length !== 10) {
      err.textContent = COPY.auth.phoneError;
      return;
    }
    const button = $('#sendOtp');
    button.disabled = true;
    button.textContent = COPY.auth.sending;
    try {
      await api('/api/auth/send-otp', { method: 'POST', body: { phone: digits } });
      state.pendingPhone = digits;
      renderOtp(digits);
    } catch (e) {
      err.textContent = e.message;
      button.disabled = false;
      button.textContent = COPY.auth.sendOtp;
    }
  });
}

function renderOtp(digits) {
  const masked = `${'•'.repeat(6)}${digits.slice(-4)}`;
  $('#authCard').innerHTML = `
    <p class="muted">${COPY.auth.otpSent(masked)}</p>
    <p class="tiny">${COPY.auth.demoOtpNote}</p>
    <form id="otpForm" novalidate>
      <div class="field">
        <label for="code">${COPY.auth.otpLabel}</label>
        <input class="input num" id="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••">
      </div>
      <button class="btn" id="verify" type="submit">${COPY.auth.verify}</button>
      <p class="err" id="authErr" role="alert"></p>
    </form>
    <div class="row">
      <button class="btn ghost sm" id="back" type="button">${COPY.auth.changeNumber}</button>
      <button class="btn ghost sm" id="resend" type="button">${COPY.auth.resend}</button>
    </div>`;
  const code = $('#code');
  $('#otpForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const err = $('#authErr');
    err.textContent = '';
    const digitsOnly = code.value.replace(/\D/g, '');
    if (digitsOnly.length !== 6) {
      err.textContent = COPY.auth.otpError;
      return;
    }
    const button = $('#verify');
    button.disabled = true;
    try {
      const result = await api('/api/auth/verify-otp', { method: 'POST', body: { phone: digits, code: digitsOnly } });
      state.token = result.token;
      state.user = result.user;
      writeStorage(TOKEN_KEY, result.token);
      state.pendingPhone = '';
      go(state.user.name ? 'home' : 'profile');
    } catch (e) {
      err.textContent = e.message;
      button.disabled = false;
    }
  });
  $('#back').addEventListener('click', renderAuth);
  $('#resend').addEventListener('click', async () => {
    try {
      await api('/api/auth/send-otp', { method: 'POST', body: { phone: digits } });
      toast(COPY.auth.resent);
    } catch (e) {
      $('#authErr').textContent = e.message;
    }
  });
  setTimeout(() => code.focus(), 50);
}

// ----------------------------------------------------------- profile ----
function renderProfile() {
  const user = state.user;
  const firstTime = !user.name;
  const canUseReferral = !user.referred_by && !Object.keys(user.best || {}).length && !Object.keys(user.tries || {}).length;
  view.innerHTML = `
    <section class="card">
      <span class="eyebrow">${firstTime ? COPY.profile.firstEyebrow : COPY.profile.editEyebrow}</span>
      <h1 tabindex="-1">${firstTime ? COPY.profile.firstHeading : COPY.profile.editHeading}</h1>
      <p class="muted">${COPY.profile.note}</p>
      <form id="profileForm" novalidate>
        <div class="field">
          <label for="name">${COPY.profile.nameLabel}</label>
          <input class="input" id="name" maxlength="40" autocomplete="nickname" value="${esc(user.name)}" placeholder="e.g. Ayush">
        </div>
        ${canUseReferral ? `
        <div class="field">
          <label for="ref">${COPY.profile.refLabel}</label>
          <input class="input code" id="ref" maxlength="6" value="${esc(captureReferralCode())}" placeholder="AB3K7Q" autocapitalize="characters">
          <p class="tiny">${COPY.profile.refHint}</p>
        </div>` : ''}
        <button class="btn" id="save" type="submit">${firstTime ? COPY.profile.save : COPY.profile.saveEdit}</button>
        <p class="err" id="pErr" role="alert"></p>
      </form>
      ${firstTime ? '' : `<button class="btn ghost" id="logout" type="button">${COPY.profile.logout}</button>`}
    </section>
    ${firstTime ? '' : referralCard(user)}`;
  $('#profileForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const err = $('#pErr');
    err.textContent = '';
    const name = $('#name').value.trim();
    if (!name) {
      err.textContent = COPY.profile.nameError;
      return;
    }
    const referral = $('#ref') ? $('#ref').value.trim().toUpperCase() : '';
    try {
      state.user = await api('/api/me', { method: 'PATCH', body: { name, referral } });
      writeStorage(REF_KEY, null);
      if (referral) toast(COPY.profile.referralApplied);
      go('home');
    } catch (e) {
      err.textContent = e.message;
    }
  });
  if ($('#logout')) $('#logout').addEventListener('click', logout);
}

function referralCard(user) {
  return `
    <section class="card refcard" aria-labelledby="refTitle">
      <h2 id="refTitle">${COPY.referral.title}</h2>
      <p class="muted">${COPY.referral.body} ${user.ref_count ? `<b>${user.ref_count} joined so far · +${num(user.ref_bonus)} points.</b>` : ''}</p>
      <div class="refcode"><span>${COPY.referral.code}</span><b class="num" id="refcode">${esc(user.ref_code)}</b>
        <button class="btn ghost sm" type="button" id="copyref">${COPY.referral.copy}</button></div>
    </section>`;
}

// -------------------------------------------------------- leaderboard ----
async function renderBoard() {
  const b = await api('/api/leaderboard');
  const me = b.me;
  const rankHeading = me && me.rank ? `#${me.rank}<span class="rank-label"> ${COPY.board.myRank}</span>` : `<span class="rank-none">${COPY.board.noRank}</span>`;
  view.innerHTML = `
    <section class="card hero">
      <span class="eyebrow"><b>${COPY.board.eyebrow}</b> · ${COPY.board.players(b.total_players)}</span>
      <h1 tabindex="-1">${rankHeading}</h1>
      ${me ? `<div class="stats">
        <div class="stat"><b class="num">${num(me.total)}</b><span>${COPY.board.totalPoints}</span></div>
        <div class="stat"><b class="num">${me.days_played}</b><span>${COPY.board.daysPlayed}</span></div>
        <div class="stat"><b class="num">${fmtSecs(me.secs_total)}</b><span>${COPY.board.totalTime}</span></div>
      </div>` : ''}
    </section>
    <section class="list" aria-labelledby="topTitle">
      <h2 id="topTitle" class="sect">${COPY.board.topTitle}<small>${COPY.board.topNote}</small></h2>
      <ol class="plain">${b.top
        .map((u) => `<li class="li"><span class="rk ${u.rank <= 3 ? 'g r' + u.rank : ''}">${u.rank}</span><span class="nm">${esc(u.name)}</span><span class="pt">${num(u.total)}</span></li>`)
        .join('') || `<li class="empty">${COPY.board.topEmpty}</li>`}</ol>
    </section>
    <section class="list" aria-labelledby="dailyTitle">
      <h2 id="dailyTitle" class="sect">${COPY.board.dailyTitle}<small>${COPY.board.dailyNote}</small></h2>
      ${b.days
        .slice()
        .reverse()
        .map((d) => `<div class="li wide"><div><b>Day ${d.day} · ${esc(d.dharma)}</b>
          <div class="winrow">${d.top.map((w) => `<span><b>${w.rank}.</b> ${esc(w.name)} · ${num(w.score)}</span>`).join('') || `<span class="muted">${COPY.board.noScores}</span>`}</div></div></div>`)
        .join('') || `<p class="empty">${COPY.board.dailyEmpty}</p>`}
    </section>`;
}

// ------------------------------------------------------------ journey ----
function renderJourney() {
  const user = state.user;
  const days = state.config.days;
  const played = Object.keys(user.best || {}).length;
  const rows = days
    .map((d) => {
      const best = user.best && user.best[String(d.day)];
      const tryStatus = user.tries && user.tries[String(d.day)];
      let status;
      if (d.state === 'upcoming') status = COPY.journey.opens(fmtIst(d.opens_at));
      else if (best) status = COPY.journey.played;
      else if (tryStatus === 'started') status = COPY.journey.unfinished;
      else status = COPY.journey.notPlayed;
      return `<li class="li"><span class="rk">${d.day}</span><span class="nm">${esc(d.dharma)}<small>${esc(d.title)} · ${esc(status)}</small></span><span class="pt">${best ? num(best.score) : d.state === 'upcoming' ? '' : '0'}</span></li>`;
    })
    .join('');
  view.innerHTML = `
    <section class="card">
      <span class="eyebrow">${COPY.journey.eyebrow}</span>
      <h1 tabindex="-1">${esc(user.name)}</h1>
      <div class="stats">
        <div class="stat"><b class="num">${num(user.total)}</b><span>${COPY.journey.totalPoints}</span></div>
        <div class="stat"><b class="num">${played}</b><span>${COPY.journey.daysPlayed}</span></div>
        <div class="stat"><b class="num">${num(user.ref_bonus)}</b><span>${COPY.journey.referralBonus}</span></div>
      </div>
    </section>
    <ol class="list plain">${rows}</ol>`;
}

// -------------------------------------------------------------- rules ----
function renderRules() {
  view.innerHTML = `
    <section class="card rules">
      <span class="eyebrow">Rules</span>
      <h1 tabindex="-1">How to play, how to win</h1>
      <dl>
        ${RULES.map(([term, text]) => `<dt>${esc(term)}</dt><dd>${esc(text)}</dd>`).join('')}
      </dl>
      <p class="tiny">${RULES_FOOTNOTE}</p>
      <button class="btn ghost" id="lg" type="button">${COPY.profile.logout}</button>
    </section>`;
  $('#lg').addEventListener('click', logout);
}

// ---------------------------------------------------------------- boot ----
async function boot() {
  captureReferralCode();
  try {
    state.config = await api('/api/config');
  } catch (err) {
    renderStatus(err.message || COPY.states.fatal, { retry: boot });
    return;
  }
  if (state.token) {
    try {
      state.user = await api('/api/me');
    } catch {
      state.user = null;
    }
  }
  const start = location.pathname.replace(/\/+$/, '') === '/thankyou' ? 'thankyou' : 'home';
  go(start, { focus: false });
}

boot();
