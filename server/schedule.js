// Contest calendar and day states. All contest times are India Standard Time (+05:30, no daylight saving).
import { DAYS } from '../public/js/content.js';

// Evidence:
//   firstDay: VERIFIED ("16 to 25 September", "Daslakshan Khel 2026").
//   dayClosesAt: INFERRED (reference Rules copy: closes at 11:59 pm the same day).
//   wrapAt: INFERRED (reference client source comment: wrap takes over Home at 25 Sep 6 PM).
//   resultsAt: PROPOSED (Kshamavani is 26 September per Rules copy; exact time unconfirmed).
export const CONTEST = Object.freeze({
  firstDay: '2026-09-16',
  dayClosesAt: '23:59',
  wrapAt: '2026-09-25T18:00:00+05:30',
  resultsAt: '2026-09-26T00:00:00+05:30',
});

function addDays(ymd, n) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export function dayWindow(day) {
  const ymd = addDays(CONTEST.firstDay, day - 1);
  return {
    opensAt: new Date(`${ymd}T00:00:00+05:30`),
    closesAt: new Date(`${ymd}T${CONTEST.dayClosesAt}:00+05:30`),
  };
}

export function dayState(day, now) {
  const { opensAt, closesAt } = dayWindow(day);
  if (now < opensAt) return 'upcoming';
  if (now < closesAt) return 'open';
  return 'closed';
}

// Public config served at /api/config. Contains no user data.
export function buildConfig(now) {
  return {
    wrap_active: now >= new Date(CONTEST.wrapAt),
    results_out: now >= new Date(CONTEST.resultsAt),
    results_at: CONTEST.resultsAt,
    attempts_per_day: 1, // INFERRED from Rules copy ("One try a day")
    days: DAYS.map((d) => {
      const w = dayWindow(d.day);
      return {
        ...d,
        state: dayState(d.day, now),
        opens_at: w.opensAt.toISOString(),
        closes_at: w.closesAt.toISOString(),
      };
    }),
  };
}
