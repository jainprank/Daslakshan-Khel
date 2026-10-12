// Entry point: `npm start`. Demo configuration via environment variables (see README.md).
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { createStore } from './store.js';

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = join(here, '..', 'public');

// DK_NOW (ISO timestamp, e.g. 2026-09-20T10:00:00+05:30) fixes the clock for demos and tests.
const clock = process.env.DK_NOW ? () => new Date(process.env.DK_NOW) : () => new Date();
const port = Number(process.env.PORT || 3000);

const isProduction = process.env.NODE_ENV === 'production';
// DK_DEMO_OTP is a fixed code that logs in any number, for shared demo links. Ignored in production.
const demoOtp = !isProduction && process.env.DK_DEMO_OTP ? process.env.DK_DEMO_OTP : null;
const store = createStore({ now: clock, pepper: process.env.DK_PEPPER || undefined, demoOtp });
// No SMS provider is wired up. Demo OTPs go to the server console and are never sent to the browser.
// In production nothing is delivered, so login cannot complete until a real provider is added.
const handler = createApp({
  publicDir,
  now: clock,
  store,
  deliverOtp: isProduction ? () => {} : undefined,
});

createServer(handler).listen(port, () => {
  console.log(`Daslakshan Khel demo running at http://localhost:${port}`);
  if (demoOtp) console.warn('DK_DEMO_OTP is set: that fixed code logs in any number. Do not share this server publicly.');
  if (isProduction) {
    console.warn('Warning: this is the in-memory demo store. Do not use it for real competitions.');
  }
});
