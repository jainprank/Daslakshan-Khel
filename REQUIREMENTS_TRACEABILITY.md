# Requirements traceability

Status key: **VERIFIED** (seen on the live reference), **INFERRED** (read in reference source), **PROPOSED** (placeholder or product decision), **NOT BUILT** (out of scope for this increment).

Test files: `test/api.test.js`, `test/schedule.test.js`, `test/scoring.test.js`, `test/routes.test.js`, `test/static.test.js`. Run with `npm test`.

## Identity, navigation and content

| ID | Requirement | Status | Implementation | Test |
|---|---|---|---|---|
| R-01 | Title "Daslakshan Khel 2026" | VERIFIED | `public/index.html` | `static.test.js` "header identity and tagline" |
| R-02 | Header "Daslakshan Khel" and tagline "दशलक्षण महापर्व · 10 days · 10 games" | VERIFIED | `public/index.html`, `content.js` (`BRAND`) | `static.test.js` "header identity and tagline" |
| R-03 | Nav labels exactly Today, Leaderboard, Journey, Rules, in that order | VERIFIED (labels) | `public/index.html` `#tabs`, `content.js` (`NAV`) | `static.test.js` "four navigation labels" |
| R-04 | Tab bar hidden for logged-out visitors | VERIFIED | `public/js/app.js` `go()` | Manual browser check (logged out, no tab bar) |
| R-05 | Tabs visible and working once logged in | INFERRED | `app.js` `go()`, `routes.js` | Manual browser check (all four tabs rendered) |
| R-06 | Post-contest home shows the wrap ("Dhanyavad") | VERIFIED | `app.js` `renderWrap`, `schedule.js` `wrap_active` | `schedule.test.js` "wrap goes live"; manual check |
| R-07 | Wrap copy, English and Hindi, as observed | VERIFIED | `content.js` (`WRAP`) | `static.test.js` (structure only); manual check |
| R-08 | Wrap stat cards: Registered, Minutes played | VERIFIED (labels) | `app.js` `renderWrap`, `store.js` `wrapData` | `api.test.js` "wrap data is public" |
| R-09 | Wrap sections: overall top 3, daily winners, referral top 3, game-points top 3, quote, Kshamavani card | VERIFIED | `app.js` `resultsBlocks`, `renderWrap` | Manual check (demo shows empty states) |
| R-10 | Ten day game titles and dharma names | VERIFIED | `content.js` (`DAYS`) | `schedule.test.js` "config lists ten day games" |
| R-11 | `/thankyou` is public and shows the wrap | INFERRED | `server/app.js` `serveStatic`, `routes.js` | `api.test.js` "/thankyou serves the app shell" |
| R-12 | Rules page copy, as in reference source | INFERRED | `content.js` (`RULES`), `app.js` `renderRules` | Manual check (renders the ten rules) |
| R-13 | Journey page (name, stats, per-day rows) | INFERRED | `app.js` `renderJourney` | Manual check |
| R-14 | Leaderboard page (rank, stats, Top 50, daily top 3) | INFERRED | `app.js` `renderBoard`, `store.js` `leaderboard` | `api.test.js` "leaderboard orders by total" |

## Authentication and competition

| ID | Requirement | Status | Implementation | Test |
|---|---|---|---|---|
| R-20 | Phone OTP login, +91, 10-digit mobile, 6-digit code | INFERRED (flow); PROPOSED (provider) | `public/js/app.js` `renderAuth`, `renderOtp`; `server/app.js` `send-otp` / `verify-otp` | `api.test.js` "a bad mobile number", "wrong code ... single-use" |
| R-21 | OTP is never returned to the browser | PROPOSED (safety rule) | `server/app.js` `deliverOtp`; `store.js` `requestOtp` | `api.test.js` "send-otp never returns the code" |
| R-22 | OTP rate limit: 3 sends per number per 10 min | PROPOSED | `store.js` `requestOtp` | `api.test.js` "OTP requests are rate-limited" |
| R-23 | OTP expires after 5 min and after 5 wrong tries | PROPOSED | `store.js` `checkOtp` | `api.test.js` "after five wrong codes" |
| R-24 | Per-IP limit on auth endpoints | PROPOSED | `server/app.js` `authRateLimit` | Not directly tested (limit is injected high in tests) |
| R-25 | Login is required for competitive play and for Journey, Leaderboard and Rules | INFERRED (reference) + product owner requirement | `routes.js` `resolveRoute` | `routes.test.js` (all cases) |
| R-26 | Logged-out visitors can see the public wrap only | VERIFIED | `routes.js` | `routes.test.js` "once the wrap is live" |
| R-27 | Logged-in account without a name is sent to the profile first | INFERRED | `routes.js` | `routes.test.js` "without a name" |
| R-28 | Profile: display name (required, ≤40 chars). City is not collected (demo decision). | INFERRED (name); PROPOSED (no city) | `store.js` `updateProfile` | `api.test.js` "profile name is validated" |
| R-29a | Demo OTP code for shared links, off in production | PROPOSED | `store.js` `checkOtp`, `server/server.js` | `store.test.js` "DK_DEMO_OTP-style code" |
| R-29 | Reject `<` and `>` and control characters in names | PROPOSED | `store.js` `cleanText` | `api.test.js` "profile name is validated" |
| R-30 | Referral: both players get 100 bonus points, once, before first game, not self | INFERRED (rules copy) | `store.js` `updateProfile` | `api.test.js` "referral codes give both players" |
| R-31 | Store no plaintext phone numbers | PROPOSED | `store.js` (HMAC keys only) | `api.test.js` "leaderboard shows only public-safe fields" (phone absent from output) |
| R-32 | Public leaderboard shows only name, city, total and rank | PROPOSED (product owner: "approved display names and competition-safe statistics") | `store.js` `leaderboard` | `api.test.js` "leaderboard shows only public-safe fields" |
| R-33 | Account data never includes internal id or phone to clients | PROPOSED | `store.js` `ownProfile` | `api.test.js` "login ... internal user id" |

## Scoring and data

| ID | Requirement | Status | Implementation | Test |
|---|---|---|---|---|
| R-40 | Server validates every score: whole number, day range, max per day (1000; 2000 on Day 10), time in range | INFERRED (max points); PROPOSED (time bound) | `scoring.js` `validateScore` | `scoring.test.js` (four tests) |
| R-40a | Placeholder game: ten rounds, server holds the targets, score = correct rounds × day max / 10 | PROPOSED (placeholder mechanic) | `scoring.js` `scoreAnswers`, `store.js` `startAttempt` / `submitAttempt` | `game.test.js` (all) |
| R-40b | Client-sent score or time is ignored; time is measured on the server | PROPOSED | `store.js` `submitAttempt` | `game.test.js` "a score the client sends is ignored" |
| R-41 | Best attempt per day: higher score, then lower time | INFERRED (tie-break from copy) | `scoring.js` `isBetterAttempt`, `store.js` `recordScore` | `scoring.test.js`, `api.test.js` "recordScore refuses invalid values" |
| R-42 | Ties: equal total shares a rank; lower total time ranks higher | INFERRED (copy) + PROPOSED (shared rank on full tie) | `scoring.js` `competitionRank`, `compareOverall` | `scoring.test.js` "competition ranking", "equal totals are split" |
| R-43 | Leaderboard: top 50, total = game + referral points | INFERRED | `store.js` `leaderboard` | `api.test.js` "leaderboard orders by total" |
| R-44 | Daily winner = top game score of the day, game points only | INFERRED (copy) | `store.js` `dailyTop` | Manual check (empty state) |
| R-45 | Score submission (`/api/day/:day/start`, `/submit`) | PROPOSED (placeholder game) | `server/app.js` `handleDay` | `game.test.js` (all) |
| R-46 | Attempt window and one-try enforcement | PROPOSED | `server/app.js` `handleDay` (window), `store.js` `startAttempt` (one try) | `game.test.js` "one try per day", "cannot be started" |
| R-46a | Replaying a submitted try is refused | PROPOSED | `store.js` `submitAttempt` | `game.test.js` "submitted try cannot be submitted again" |
| R-47 | Bonus rounds | **NOT BUILT** | Leaderboard returns `bonus: []`. | — |
| R-48 | Data retention and deletion | **NOT BUILT** (NEEDS_CONFIRMATION) | In-memory store only; nothing persisted. | — |

## Calendar

| ID | Requirement | Status | Implementation | Test |
|---|---|---|---|---|
| R-50 | Contest dates 16 to 25 September 2026, IST | VERIFIED (dates); INFERRED (year is 2026 from the title) | `schedule.js` `CONTEST` | `schedule.test.js` "day 1 opens" |
| R-51 | Day windows open 12:00 am and close 11:59 pm IST | INFERRED | `schedule.js` `dayWindow` | `schedule.test.js` "day state changes at the window edges" |
| R-52 | Wrap goes live 25 Sep 6 PM IST | INFERRED (source comment) | `schedule.js` `CONTEST.wrapAt` | `schedule.test.js` "wrap goes live" |
| R-53 | Results out 26 Sep (Kshamavani) | PROPOSED (time unconfirmed) | `schedule.js` `CONTEST.resultsAt` | `schedule.test.js` "wrap goes live" |

## Accessibility, safety and quality

| ID | Requirement | Status | Implementation | Test |
|---|---|---|---|---|
| R-60 | Semantic landmarks, labels on inputs, one heading per screen, skip link | PROPOSED (WCAG review not done) | `public/index.html`, `app.js` | `static.test.js` (structure) |
| R-61 | Visible focus outline on controls | PROPOSED | `styles.css` `:focus-visible` | Manual check |
| R-62 | No inline scripts or handlers (CSP-compatible) | PROPOSED | `static.test.js` | `static.test.js` "no inline scripts" |
| R-63 | Security headers and CSP on every response | PROPOSED | `server/app.js` `SECURITY_HEADERS` | `api.test.js` "/thankyou serves the app shell" |
| R-64 | Static files cannot escape `public/` | PROPOSED | `server/app.js` `serveStatic` | `api.test.js` "path traversal" |
| R-65 | Request body limit (4 KB) and JSON validation | PROPOSED | `server/app.js` `readJson` | Not directly tested |
| R-66 | Mobile layout, no horizontal scroll at 375px | PROPOSED | `styles.css` | Manual check at 375px (no overflow) |
| R-67 | Reduced-motion respected | PROPOSED | `styles.css` | Visual only |
| R-68 | No child personal data beyond display name and optional city | PROPOSED (safety rule) | `app.js` `renderProfile`, `store.js` | `api.test.js` (no phone or id in output) |
| R-69 | Keyboard-accessible tabs and buttons | PROPOSED | Native `<button>` elements | Manual check (tab order) |
