# Reference audit: Daslakshan Khel

Reference: https://daslakshan.web.app/?ref=U5NKWE
Inspected: 2026-10-12, in the in-app browser (desktop pane), plus a download of the public `index.html`, `app.js` (v=49) and `style.css` (v=34).

## What was inspected, and how

| Method | Result |
|---|---|
| Live page, logged-out, fresh session | Rendered post-contest "Dhanyavad" page (the wrap). Accessibility tree, page text, desktop screenshot. |
| Live page, JavaScript view of the DOM | Title, meta, scripts, stylesheets, full visible text. |
| Public source (`index.html`, `app.js`, `style.css`) | Read for routes, API calls, copy and rules. Not run, not copied. |
| Mobile viewport of the reference | **Not captured.** The mobile comparison is still open (see NEEDS_CONFIRMATION.md). |
| Logged-in views (Today, Leaderboard, Journey, Rules, Profile, login) | **Not rendered.** The contest is over and the reference shows only the wrap to logged-out visitors, so I could not reach these screens. Their content comes from source only and is marked INFERRED. |
| The ten game screens | **Not reached.** Only the ten game titles are visible on the public page. Mechanics are unknown. |

Screenshots were taken in-session. They are not saved in this repo.

## Evidence labels

- **VERIFIED**: seen on the live page or in its HTML during this inspection.
- **INFERRED**: read in the reference client source, not seen rendered.
- **PROPOSED**: a placeholder or product decision. Needs owner confirmation.

## Screen and component inventory

| # | Screen / component | Observed behaviour | Evidence | Confidence | Implementation note |
|---|---|---|---|---|---|
| 1 | Document title | `Daslakshan Khel 2026` | Live page + HTML | VERIFIED | Same in `public/index.html`. |
| 2 | Meta description | "Ten days, ten dharmas, one leaderboard. A new game every day of Daslakshan Parv, prizes for the top 3 on Kshamavani." | HTML | VERIFIED | Same. |
| 3 | Header brand | Crest, "Daslakshan Khel", "दशलक्षण महापर्व · 10 days · 10 games" | Live page text + screenshot | VERIFIED | Same text. Crest is a **placeholder** drawn for this build (not the reference's artwork). |
| 4 | Home when wrap is live (Today tab) | Shows the wrap ("Dhanyavad"), not a game screen | Live page | VERIFIED | Implemented in `renderWrap`. Today during the contest is **unverified** (see row 17). |
| 5 | Wrap hero | "Daslakshan Khel 2026 · 16 to 25 September", "Dhanyavad", "धन्यवाद", thank-you paragraph in English and Hindi | Live page text + screenshot | VERIFIED | Same copy in `content.js` (`WRAP`). |
| 6 | Logged-out CTA | "Log in to see your journey · अपनी यात्रा देखें" | Live page | VERIFIED | Opens login (`data-nav="auth"`). |
| 7 | Logged-in CTA | "My journey · मेरी यात्रा" | Source (INFERRED) | INFERRED | Implemented. Not seen rendered. |
| 8 | Registered / Minutes played stats | "Registered · पंजीकृत" and "Minutes played · मिनट खेले" with the 🙏 and ⏳ icons. Reference showed 1351 and 6,871 at inspection. | Live page | VERIFIED (labels and icons), VERIFIED (figures were on the page, not reproduced) | Implemented from `/api/wrap`. Demo shows 0 (no real data). |
| 9 | Overall top 3 | "Overall top 3 · कुल विजेता", note on total points, ties and Kshamavani prizes | Live page | VERIFIED | Implemented. Demo has no scores, so it shows "No scores yet.". |
| 10 | Daily winners | One row per day: "Day N · dharma · game title · city", with score | Live page | VERIFIED | Implemented. Row shows "No winner" when a day has no score. |
| 11 | Top 3 by referral | "Top 3 by referral · रेफ़रल", "Most points from inviting friends." | Live page | VERIFIED | Implemented. |
| 12 | Top 3 by game points | "Top 3 by game points · खेल के पॉइंट", "no referral" note | Live page | VERIFIED | Implemented. |
| 13 | Closing quote | "Agle saal phir milenge · अगले साल फिर मिलेंगे", "See you at Daslakshan Khel 2027..." | Live page | VERIFIED | Implemented. |
| 14 | Kshamavani card | "Uttam Kshama · उत्तम क्षमा" with forgiveness message in English and Hindi | Live page | VERIFIED | Implemented. |
| 15 | Tab bar | Four tabs: Today, Leaderboard, Journey, Rules | Accessibility tree (labels VERIFIED); tab bar hidden for logged-out visitors (VERIFIED from screenshot) | VERIFIED (labels, hidden logged-out); INFERRED (behaviour when logged in) | Implemented. Tab icons are **not reproduced** (deviation). |
| 16 | Ten day games (titles) | Day 1 "Memory of symbols" through Day 10 "Dharma Setu + Chhupa Lanchhan". Dharma names: Uttam Kshama, Mardav, Arjav, Shauch, Satya, Sanyam, Tap, Tyag, Akinchanya, Brahmacharya. | Live page (leaderboard text) | VERIFIED (titles and dharma names). Mechanics UNKNOWN. | Titles in `content.js` (`DAYS`). Games not built. |
| 17 | Today screen during the contest | Game screen per day; "Open" / "upcoming" states. | Source (INFERRED). Contest is over; not observable. | INFERRED | Placeholder only: shows the day's name and says the game is not built. |
| 18 | Ten game screens (play, timer, results) | Source hints at timers, a one-try rule and per-game engines (memory, scramble, quiz, catch, whack, flappy, stack, and others). | Source only | INFERRED / UNKNOWN | **Not implemented.** Mechanics must be observed in a live contest or confirmed by the owner. |
| 19 | Login (phone OTP) | "Welcome", "Log in with your mobile number to start playing.", +91 prefix, 10-digit field, "Send OTP", 6-digit OTP, resend, change number | Source only | INFERRED | Implemented as a demo with no SMS. OTP is printed to the server console. |
| 20 | Profile | "What should we call you?" (first time), "Your details" (edit), name, city, optional referral code | Source only | INFERRED | Implemented. |
| 21 | Referral card | "Invite friends, earn 100 points each", your code, copy, "Share on WhatsApp" | Source only | INFERRED | Implemented (copy). The WhatsApp share is **not** implemented. |
| 22 | Leaderboard | Hero with my rank, Total points / Days played / Total time; "Top 50"; "Daily top 3" per day | Source (INFERRED). Same section titles appear on the wrap (VERIFIED). | INFERRED | Implemented. Bonus rounds section omitted (no bonus data). |
| 23 | Journey | "My journey", name, city, total points / days played / referral bonus, then one row per day with status | Source only | INFERRED | Implemented. |
| 24 | Rules | Ten rules (ten days, midnight window, one try, points, daily winner, final, referrals, bonus rounds, fair play, final authority) and footnote | Source only | INFERRED | Implemented verbatim from the source text. Rendered page not seen. |
| 25 | Loading / error / retry | Source: "Try again" button; errors show the server's message | Source only | INFERRED | Implemented: loading text, error card with "Try again". Offline message is implemented but not tested in a real offline browser. |
| 26 | Toast | Short status message, `role="status"` | Source only | INFERRED | Implemented. |
| 27 | Referral parameter `?ref=` | Source saves `ref` to local storage and pre-fills the profile referral field | Source only | INFERRED | Implemented the same way. The live page looked identical with and without `?ref=` (VERIFIED for that page, which is the wrap). Its meaning is an open question (NEEDS_CONFIRMATION). |
| 28 | Typography | Martel (headings), Mukta (body), Noto Sans Devanagari (Hindi) from Google Fonts | Live page HTML | VERIFIED | Same families. |
| 29 | Colour and layout | Ivory background, deep green, gold accents; single centred column about 500px wide; fixed bottom tabs | Live page screenshot + reference stylesheet | VERIFIED (approximate; not pixel-compared) | Tokens chosen to match. No pixel diff was run. |
| 30 | Background temple image and garland | Reference has a temple image behind the page and a gold dotted garland at the top of the hero | Reference stylesheet + screenshot | VERIFIED (exists) | **Not reproduced**: temple image is not reused. A simple dotted garland is drawn in CSS. |

## Security and privacy observations from the reference

These are observations from source and the live page. They are not verified attacks, and they need the owner's review.

1. **Public personal data.** The live wrap page shows full display names and cities of winners and top players. Only pseudonymous display names should be shown for a children's competition. I did not copy any names, cities or scores into this repo.
2. **Demo-OTP code path.** Source includes a branch that shows a `dev_code` from the send-OTP response on screen. I did not trigger it. This build never returns a code to the browser. The owner should confirm the production server never sets `dev_code`.
3. **Bearer token in local storage.** Source keeps the session token in `localStorage`. Any script injected into the page could read it. A production build should use an `HttpOnly`, `Secure`, `SameSite` cookie. This build keeps the reference's approach for the demo only.
4. **Public leaderboard detail.** Leaderboard rows include city. Whether city is needed is an owner decision.

## Things the reference does that this build does not do yet

- Ten game engines and their scoring. (Mechanics unknown.)
- Server-side attempt endpoint (`/api/day`, `/api/attempt` in the reference source). This build records scores only through an internal function, so no client can submit a score.
- Bonus rounds, live windows and countdowns.
- Admin dashboard and account suspension.
- WhatsApp share.
- Real SMS delivery for OTP.
- Persistent storage. This build keeps everything in memory.
