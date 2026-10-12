import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BRAND, NAV } from '../public/js/content.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const html = await readFile(join(root, 'index.html'), 'utf8');

test('the four navigation labels exist in the shell, in the reference order', () => {
  const nav = html.slice(html.indexOf('<nav class="tabs"'), html.indexOf('</nav>'));
  const labels = [...nav.matchAll(/<button type="button" data-nav="(\w+)">([^<]+)<\/button>/g)].map((m) => m[2]);
  assert.deepEqual(labels, ['Today', 'Leaderboard', 'Journey', 'Rules']);
  assert.deepEqual(NAV.map((n) => n.label), labels);
});

test('the header identity and tagline match the reference', () => {
  assert.ok(html.includes('<b>Daslakshan Khel</b>'));
  assert.ok(html.includes(`<small>${BRAND.tagline}</small>`));
  assert.equal(BRAND.tagline, 'दशलक्षण महापर्व · 10 days · 10 games');
  assert.ok(html.includes('<title>Daslakshan Khel 2026</title>'));
});

test('the page has no inline scripts or inline event handlers (CSP-compatible)', () => {
  assert.ok(!/<script(?![^>]*\bsrc=)/.test(html), 'inline <script> found');
  assert.ok(!/\son[a-z]+=/i.test(html), 'inline event handler attribute found');
});

test('the tab bar is hidden until login and has an accessible name', () => {
  assert.match(html, /<nav class="tabs" id="tabs" aria-label="Sections" hidden>/);
});

test('the page declares a language and a viewport for phones', () => {
  assert.match(html, /<html lang="en">/);
  assert.match(html, /name="viewport" content="width=device-width, initial-scale=1/);
});
