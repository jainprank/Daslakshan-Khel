// Shared content and contest configuration. Imported by the browser (app.js) and by the server (server/schedule.js).
//
// Evidence tags used in comments:
//   VERIFIED  - seen on the live reference page (https://daslakshan.web.app/?ref=U5NKWE) on 2026-10-12.
//   INFERRED  - read in the reference client source, not rendered in this inspection (contest is over).
//   PROPOSED  - placeholder or product decision; needs owner confirmation (see NEEDS_CONFIRMATION.md).

// VERIFIED: document title, header title and tagline.
export const BRAND = Object.freeze({
  name: 'Daslakshan Khel',
  documentTitle: 'Daslakshan Khel 2026',
  tagline: 'दशलक्षण महापर्व · 10 days · 10 games',
});

// VERIFIED: navigation labels and their order (Today, Leaderboard, Journey, Rules).
export const NAV = Object.freeze([
  { id: 'home', label: 'Today' },
  { id: 'board', label: 'Leaderboard' },
  { id: 'journey', label: 'Journey' },
  { id: 'rules', label: 'Rules' },
]);

// VERIFIED: dharma names and game titles for Days 1-10, as printed on the reference leaderboard.
// The game title is shown after the dharma in each row. Mechanics are NOT verified (see NEEDS_CONFIRMATION.md).
export const DAYS = Object.freeze([
  { day: 1, dharma: 'Uttam Kshama', dharmaHi: 'उत्तम क्षमा', title: 'Memory of symbols' },
  { day: 2, dharma: 'Uttam Mardav', title: 'Scrambled letters' },
  { day: 3, dharma: 'Uttam Arjav', title: 'Tirthankar and lanchhan' },
  { day: 4, dharma: 'Uttam Shauch', title: 'Put it in order' },
  { day: 5, dharma: 'Uttam Satya', title: 'Follow the lamps' },
  { day: 6, dharma: 'Uttam Sanyam', title: 'Dharma and meaning' },
  { day: 7, dharma: 'Uttam Tap', title: 'Jain GK quiz' },
  { day: 8, dharma: 'Uttam Tyag', title: 'Kaun Alag Hai?' },
  { day: 9, dharma: 'Uttam Akinchanya', title: 'Tyag ki Tokri' },
  { day: 10, dharma: 'Uttam Brahmacharya', title: 'Dharma Setu + Chhupa Lanchhan' },
]);

// VERIFIED: wrap (post-contest home) copy. Hindi lines are verified where marked.
export const WRAP = Object.freeze({
  eyebrow: 'Daslakshan Khel 2026', // VERIFIED
  dates: '16 to 25 September', // VERIFIED
  heading: 'Dhanyavad', // VERIFIED
  headingHi: 'धन्यवाद', // VERIFIED
  endedEyebrow: 'The game has ended', // VERIFIED
  endedEyebrowHi: 'खेल समाप्त', // VERIFIED
  endedHeading: 'Winners coming soon', // VERIFIED
  endedBody: 'The game has ended. We will announce the winners shortly.', // VERIFIED
  endedBodyHi: 'खेल समाप्त हो गया है। विजेताओं की घोषणा जल्द ही की जाएगी।', // VERIFIED
  meaning: 'Ten days, ten dharmas, one game a day. Thank you for playing, for sharing, and for coming back every morning. The contest has now ended.', // VERIFIED
  meaningHi: 'दस दिन, दस धर्म, हर दिन एक खेल। खेलने, बाँटने और रोज़ लौट आने के लिए आपका धन्यवाद। प्रतियोगिता अब समाप्त हुई।', // VERIFIED
  ctaLogin: 'Log in to see your journey · अपनी यात्रा देखें', // VERIFIED
  ctaJourney: 'My journey · मेरी यात्रा', // INFERRED (logged-in variant)
  overall: { title: 'Overall top 3 · कुल विजेता', note: 'Total points over the ten days. Ties go to the lower total time. Prizes on Kshamavani.' }, // VERIFIED
  daily: { title: 'Daily winners · दैनिक विजेता', note: 'Top scorer of each day’s game. Game points only, the faster player wins a tie.' }, // VERIFIED
  referral: { title: 'Top 3 by referral · रेफ़रल', note: 'Most points from inviting friends.' }, // VERIFIED
  gameTop: { title: 'Top 3 by game points · खेल के पॉइंट', note: 'Points from the ten days and bonus rounds only, no referral.' }, // VERIFIED
  quote: { title: 'Agle saal phir milenge · अगले साल फिर मिलेंगे', body: 'See you at Daslakshan Khel 2027, a new game for every dharma.' }, // VERIFIED
  kshama: {
    title: 'Uttam Kshama · उत्तम क्षमा', // VERIFIED
    body: 'If anything in these ten days hurt or troubled you, please forgive us. Kshamavani greetings to you and your family.', // VERIFIED
    bodyHi: 'इन दस दिनों में कोई भूल हुई हो तो क्षमा करें। आपको और आपके परिवार को क्षमावाणी की शुभकामनाएँ।', // VERIFIED
  },
});

// Auth, profile, leaderboard, journey copy. Source: reference client (INFERRED) unless marked.
export const COPY = Object.freeze({
  authHero: {
    intro: "A new game every day of Daslakshan Parv, 16 to 25 September, each one about that day's dharma. Collect points. The top 3 win on Kshamavani.",
  },
  auth: {
    welcome: 'Welcome',
    intro: 'Log in with your mobile number to start playing.',
    phoneLabel: 'Mobile number',
    phonePrefix: '+91',
    sendOtp: 'Send OTP',
    sending: 'Sending…',
    phoneError: 'Enter a 10-digit mobile number.',
    privacy: 'You log in once. Your number is used only to contact winners.',
    otpSent: (masked) => `We sent an OTP to +91 ${masked}.`,
    demoOtpNote: 'Demo build: the OTP is printed to the server console, not shown here.',
    otpLabel: '6-digit OTP',
    verify: 'Log in',
    otpError: 'Enter the 6-digit OTP.',
    changeNumber: 'Change number',
    resend: 'Resend OTP',
    resent: 'OTP sent again.',
  },
  profile: {
    firstEyebrow: 'One last thing',
    firstHeading: 'What should we call you?',
    editEyebrow: 'Your profile',
    editHeading: 'Your details',
    note: 'This name appears on the leaderboard.',
    nameLabel: 'Name',
    refLabel: 'Referral code (optional)',
    refHint: 'Got a code from a friend? You both get 100 bonus points.',
    save: 'Continue',
    saveEdit: 'Save changes',
    nameError: 'Enter your name.',
    logout: 'Log out',
    referralApplied: 'Referral applied: +100 bonus points for you both.',
  },
  referral: {
    title: 'Invite friends, earn 100 points each',
    body: 'Share your code. When a friend signs up with it, you both get 100 bonus points.',
    code: 'Your code',
    copy: 'Copy',
    share: 'Share on WhatsApp',
  },
  board: {
    eyebrow: 'Leaderboard',
    noRank: 'No rank yet',
    myRank: 'my rank',
    totalPoints: 'Total points',
    daysPlayed: 'Days played',
    totalTime: 'Total time',
    topTitle: 'Top 50',
    topNote: 'The top 3 on Kshamavani win prizes. Ties go to the lower total time.',
    topEmpty: 'No scores yet. Play today’s game to be the first on the board.',
    dailyTitle: 'Daily top 3',
    dailyNote: 'Game points only. The top scorer of each day wins a daily prize.',
    dailyEmpty: 'Daily scores appear here from Day 1.',
    noScores: 'No scores yet',
    players: (n) => (n === 1 ? '1 player' : `${n} players`),
  },
  journey: {
    eyebrow: 'My journey',
    totalPoints: 'Total points',
    daysPlayed: 'Days played',
    referralBonus: 'Referral bonus',
    notPlayed: 'not played yet',
    unfinished: 'started, not finished (0 points)',
    played: 'played',
    opens: (t) => `opens ${t}`,
  },
  today: {
    eyebrow: 'Today',
    upcoming: (t) => `Today's game opens ${t}.`,
    closed: 'This day’s game has closed. See you tomorrow.',
    used: 'You have used your try for today.',
    start: 'Start today’s game',
    startNote: 'You get one try. The clock starts when you tap Start, and reloading the page does not give it back.',
    placeholder: 'This is a placeholder game. The real mechanics are not built yet (see NEEDS_CONFIRMATION.md).',
  },
  game: {
    placeholderNote: 'Placeholder game: tap the shape named in each round. Not the real game.',
    start: 'Start game',
    round: (i, n) => `Round ${i} of ${n}`,
    prompt: 'Tap the',
    done: 'Checking your answers…',
    scoreLabel: 'Points',
    correctLabel: 'Correct',
    timeLabel: 'Time',
    back: 'Back to Today',
    journey: 'My journey',
    shapes: { circle: 'Circle', square: 'Square', triangle: 'Triangle', star: 'Star' },
  },
  states: {
    loading: 'Loading…',
    retry: 'Try again',
    networkError: 'We could not reach the server. Check your connection and try again.',
    fatal: 'Something went wrong while starting the app.',
  },
});

// INFERRED: Rules page copy from the reference client source. Rendered text was not captured in this inspection.
export const RULES = Object.freeze([
  ['Ten days', '16 to 25 September 2026, the Digambar Daslakshan Parv (दसलक्षण पर्व). One dharma and one new game each day.'],
  ['Midnight to 11:59 pm', 'Each day’s game opens at 12:00 am IST and closes at 11:59 pm the same day. Play whenever suits you.'],
  ['One try a day', 'You get a single try. It is used the moment you tap Start, the clock runs from that moment, and reloading the page does not give it back. Read the how-to screen first.'],
  ['Points', 'Up to 1000 a day, and 2000 on Day 10. Correct and quick earns more. Every game’s how-to screen says how its points work.'],
  ['Daily winner', 'The top scorer of each day’s game wins a daily prize. Only that day’s game points count here, not referral bonus points.'],
  ['The final', 'On 26 September, Kshamavani (क्षमावाणी), the top 3 by total points over ten days win. Ties go to the player with the lower total time.'],
  ['Referrals', 'Every player has a referral code. A friend who signs up with your code gets 100 bonus points, and so do you, for every friend who joins. Your total = game points + bonus points.'],
  ['Bonus rounds', 'Bonus rounds with bonus points may be announced from time to time. They appear at the top of the home screen with their live window and a countdown, and their points count in your total but not in the daily winner.'],
  ['Fair play', 'One phone, one account. Scores are computed on the server. The admin can suspend accounts that play unfairly.'],
  ['Final authority', 'All rules, scores and results are decided by the developer, whose decision is final. Rules may be changed or added at any time.'],
]);

export const RULES_FOOTNOTE = 'Please confirm dates with your sangh. Content follows the Digambar tradition.'; // INFERRED
