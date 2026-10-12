# Daslakshan Khel

A reference recreation of [Daslakshan Khel](https://daslakshan.web.app/?ref=U5NKWE), the Jain festival game app (दशलक्षण महापर्व · 10 days · 10 games).

**Status: early build, demo only.** The shell, navigation, the post-contest wrap, rules, leaderboard and login/profile flows are in place, with an in-memory demo backend. The ten game screens are **not built**: their mechanics are unverified. See [REFERENCE_AUDIT.md](REFERENCE_AUDIT.md) and [NEEDS_CONFIRMATION.md](NEEDS_CONFIRMATION.md).

## Stack

- **Frontend:** vanilla HTML, CSS and JavaScript ES modules. No build step, no framework. (Matches the reference, which is also plain JS.)
- **Backend:** Node.js 20+ `http` server with no dependencies. JSON API under `/api/*` and static files from `public/`.
- **Tests:** Node's built-in test runner (`node --test`).
- **Dependencies:** none at runtime. Fonts come from Google Fonts, as in the reference.

Chosen because there was no existing project, the reference is plain JS, and a zero-dependency server keeps the audit surface small.

## Layout

```
public/            browser app (index.html, css/, js/, img/)
  js/app.js        views and router
  js/routes.js     route guard (pure, tested)
  js/content.js    all copy, day titles and rules, with evidence tags
server/
  server.js        entry point
  app.js           HTTP handler, API routes, static files, security headers
  store.js         in-memory accounts, OTP, sessions, referrals, scores, leaderboard
  scoring.js       score validation and ranking rules (server-side)
  schedule.js      contest calendar and day states (IST)
test/              unit and API tests
```

## Setup

Requires Node.js 20 or newer. No install step is needed.

```bash
cd Daslakshan-Khel
npm start
```

Open http://localhost:3000 (or the `PORT` you set).

## Environment variables

| Name | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | HTTP port. |
| `DK_NOW` | real clock | Fixes the clock, as an ISO timestamp with offset, e.g. `2026-09-20T10:00:00+05:30`. For demos and manual checks. |
| `DK_PEPPER` | random per process | Secret used to key phone-number and OTP hashes. Set it to keep accounts usable across restarts. Use a managed secret in any real deployment. |
| `DK_DEMO_OTP` | unset | Fixed 6-digit code that logs in any number, for shared demo links. Ignored when `NODE_ENV=production`. Do not expose a server that sets it. |
| `NODE_ENV` | unset | When `production`: OTPs are not printed or delivered, `DK_DEMO_OTP` is ignored, and a warning is logged. |

## Demo login

1. Open the app and tap the login button on the wrap page.
2. Enter any 10-digit mobile number starting with 6 to 9.
3. The 6-digit code is printed to the **server console**, not shown in the browser (`[demo] OTP for mobile ending ...`).
4. Enter the code, then enter a display name.
5. Or set `DK_DEMO_OTP=123456` and use that code for any number (local or shared demos only).

## Playing the placeholder game

Each day's game is a placeholder: ten rounds of "tap the shape named". It exists to test the flow, not the real mechanics.

- The game opens on its day only (IST). Use `DK_NOW` to move the clock, e.g. `DK_NOW=2026-09-20T10:00:00+05:30` for Day 5.
- You get one try. Starting it spends the try. Reloading does not give it back, and an unfinished try scores 0.
- Your answers are scored on the server. The browser's numbers are ignored.
- The prompt is shown to the player, so a script could answer every round. This proves the flow and server-side scoring, not anti-cheat.

## Tests

```bash
npm test
```

Covers: the contest calendar and window edges, score validation and ranking (including ties), the route guard (logged-out, wrap, profile-first, play), the API (auth gating, OTP validation, rate limits, expiry, single-use codes, profile validation, referral rules, public-safe leaderboard, path traversal), the placeholder game (window checks, one try, server-side scoring, replay refusal), the demo OTP option, and the HTML contract (nav labels, tagline, no inline scripts).

Manual checks done in a browser: wrap page (logged out and logged in), login through the OTP console code, profile, all four tabs, and a 375px-wide layout with no horizontal scroll.

Not yet covered: automated browser tests (none installed, to keep dependencies at zero), keyboard-only walkthrough, screen-reader testing, and a pixel comparison with the reference.

## Deployment

**Not deployed.** Nothing here has been run on a public host. Before any real use:

- Replace the in-memory store with a persistent database, and put `DK_PEPPER` in a managed secret.
- Add an SMS provider for OTP delivery. Right now login cannot complete in production.
- Serve over HTTPS and move the session token to an `HttpOnly`, `Secure`, `SameSite` cookie.
- Decide data retention and the account deletion path (NEEDS_CONFIRMATION.md, items 15 to 18).
- Get the game specs, scoring and dates confirmed (items 1 to 8).

## Demo limits

- All data is in memory and is lost on restart.
- Games are placeholders. Real game mechanics are not built.
- Leaderboard, daily winners and wrap totals fill only as placeholder games are played.
- City is not collected, so the leaderboard shows display names only.
- The lotus crest is a placeholder drawn for this build.

## Changing content

All visible copy, day titles and rules live in `public/js/content.js`. Each block has an evidence tag: `VERIFIED` (seen on the live reference), `INFERRED` (read in reference source), or `PROPOSED` (placeholder). Do not change a VERIFIED string without new evidence.
