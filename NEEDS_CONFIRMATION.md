# Needs confirmation

Every unknown or assumption in this build. Items marked **Blocking** stop the next increment (game screens or real competition use). The open-decision numbers match the product brief.

## Decided for the demo (2026-10-12)

These were chosen for the initial demo only. They are not final product decisions.

| Item | Demo decision | Still open for launch |
|---|---|---|
| Login scope (2) | Follow the reference: login gates every tab; only the thank-you page is public. | Brief says login only for competing. Owner to confirm before launch. |
| Games (1) | Ten placeholder games. Each shows the verified title and a neutral "tap the shape named" mechanic. Labelled as placeholders. No religious content. | Real mechanics, instructions and answer keys (item 1). |
| SMS / OTP (3) | No provider. Codes print to the server console. Optional `DK_DEMO_OTP` fixed code for shared demo links; off by default and ignored when `NODE_ENV=production`. | Provider choice. |
| Scoring (4) | Rules copy: up to 1000 a day, 2000 on Day 10. Each correct round = 1/10 of the day maximum. One try a day, spent on Start. Abandoned tries score 0. Ties go to lower time. | Real per-game formula, one-try rules for the real timer. |
| Dates (6) | 16–25 Sep 2026, IST. Demo any day with `DK_NOW`. | Owner to confirm window times. |
| Results time (8) | 26 Sep 00:00 IST placeholder. | Real release time. |
| Leaderboard privacy (15) | Public rows show display name, points and rank. City is not collected at all. | Child-safety review of display names. |
| Hosting and persistence (5) | In-memory, run locally. `DK_PEPPER` set per environment. | Hosting target, database, backend credentials. |

**Known limit of the placeholder game:** the prompt is shown to the player, so a script could answer every round. It proves the server-side scoring and one-try flow, not anti-cheat. Real games must keep their answers hidden from the client.

## Blocking

1. **Ten game mechanics, instructions and answer keys (brief #17).** Only the game titles are visible on the reference (leaderboard text). Mechanics, instructions, screens and answer keys are not verified. Source hints at per-game engines, but these are not documented anywhere I could inspect. I did not invent them. *Needed:* the owner's game specs, or a live contest session to observe each game.
2. **Login rule (brief #18).** The reference gates the app behind login for everything except the post-contest wrap (INFERRED from source; logged-out visitors see only the wrap). The product brief asks that login be required only for competitive actions. These conflict. This build follows the reference (login gates the tabs). *Needed:* decision: keep login for all tabs, or only for play, scoring and leaderboard entry.
3. **Login provider (brief #19).** The reference uses phone OTP with a +91 mobile number (INFERRED from source). No SMS provider exists here. This build prints OTPs to the server console in development and delivers nothing in production. *Needed:* the chosen provider and sender details.
4. **Score formula, retry policy, tie-breaker, leaderboard period (brief #20).** Reference rules copy (INFERRED) says: up to 1000 points a day, 2000 on Day 10, one try a day, ties go to lower total time, and daily winners use game points only. The exact per-game formula, what "one try" means for the timer, and the leaderboard period (ten days, then final) are not confirmed.
5. **Persistence and hosting (briefs #24, #26).** Nothing is persisted. The store is in memory and resets on restart. *Needed:* hosting target, database, and backend credentials.

## Dates and calendar

6. **Time zone and day windows (brief #21).** Dates 16 to 25 September 2026 are verified. The IST window (12:00 am to 11:59 pm) is INFERRED from Rules copy. This build assumes one game per day, unlocking at midnight IST, with no extra daily schedule.
7. **Wrap time (25 Sep 6 PM IST).** INFERRED from a source comment. Owner should confirm.
8. **Results release (26 Sep, time unknown).** PROPOSED: 00:00 IST on 26 Sep. Owner decides the real time.
9. **Year 2026.** Taken from the page title.

## Referral

10. **What the referral parameter means (brief #22).** The page reads `?ref=U5NKWE` and saves it locally. Source treats it as a referral code, filled into the profile form. Whether it also identifies a campaign or referrer for analytics is unknown. This build keeps it as a referral code only.
11. **Referral rules.** Both sides get 100 points; code can be added once, before the first game, and not by yourself (INFERRED from copy and source). Whether this also applies to unknown codes, or to codes from a deleted account, is not decided.

## Prizes, eligibility and disputes (brief #23)

12. **Prizes.** The reference says "Prizes on Kshamavani" but names none. This build invents no prizes.
13. **Eligibility and age rules.** Not stated anywhere. None are implemented.
14. **Dispute process and final authority.** The reference rules say the developer's decision is final (INFERRED). That wording is the reference's, not the owner's, and needs legal review before reuse.

## Data and privacy (brief #24)

15. **What is public on the leaderboard.** This build shows display name, city, total and rank. The reference shows full names and cities for winners on the live wrap (VERIFIED). Child-safety review needed. Whether city should be shown at all is open.
16. **Retention and deletion.** Not decided. This build has no persistence. A real build needs an account deletion path and a retention period.
17. **Phone number use.** The reference says the phone is "used only to contact winners" (INFERRED). This build stores only a keyed hash of the phone, so it cannot contact anyone. If winners must be contacted, the storage design must change and be reviewed.
18. **Child data.** The brief says children are a primary audience. Account creation needs a parent or guardian decision before launch.

## Content (brief #25)

19. **Religious content and wording.** Dharma names and day titles are from the reference (VERIFIED). The Rules text is INFERRED from source and has not been reviewed. Only one Hindi dharma name (Uttam Kshama) is verified. The others are not in this build. A knowledgeable reviewer must approve all explanations before release. Do not assume one Jain community's wording applies everywhere.
20. **Rules footnote.** "Content follows the Digambar tradition." is from the reference source. The owner should confirm it.
21. **Who approves corrections.** Unknown.

## Reference access gaps

22. **Logged-in screens not seen.** Today (during the contest), Leaderboard, Journey, Rules, Profile and login were not rendered during this inspection. Their layout is INFERRED from source and must be checked against the live site when a logged-in session is available.
23. **Mobile reference not captured.** Only a desktop capture of the reference was taken. The mobile comparison is open.
24. **Returning-session and refresh behaviour.** Not tested. Source suggests the token is kept in local storage and the Today screen re-reads config on load.
25. **Bonus rounds.** Source describes live bonus rounds with countdowns. Not observed and not built.

## Assumptions in this build

26. **Demo backend.** In-memory, zero dependencies, with a fixed pepper unless `DK_PEPPER` is set. Not production-secure. Not for real competition.
27. **Placeholder artwork.** The lotus crest is drawn for this build. The temple background and the reference's icons are not reproduced.
28. **Score and time bounds.** Maximum seconds per day (24 hours) is PROPOSED.
29. **Session length.** 30 days (PROPOSED).
30. **Leaderboard size.** Top 50 (from the reference's visible heading).
31. **Ranking of ties on total and time.** Players tied on both share a rank (PROPOSED).

## Open security items

32. The reference's OTP flow has a `dev_code` display path (source only). Owner to confirm production never returns a code.
33. The reference keeps the session token in `localStorage`. Production should use an `HttpOnly` cookie. This build keeps the local-storage pattern for the demo only.
34. The reference's rate limits were not tested (no live login attempted). This build's limits are PROPOSED and are enforced only in memory.
