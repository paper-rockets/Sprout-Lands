// Opens the running game in a real (headless) Chrome so scripts can press keys,
// click, read the game's state and take screenshots.
//
//   import { openGame } from './browser.mjs';
//   const game = await openGame('?at=19,15', { width: 1280, height: 720 });
//   await game.press('Space');
//   await game.shot('out.png');
//   await game.close();
//
// The game must already be running: `npm run dev` (port 8190).

import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const CHROME_PATHS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
];

export async function openGame(query = '', { width = 1280, height = 720, base = 'http://localhost:8190/', storage = 'clean', startScreen = false } = {}) {
  const executablePath = process.env.CHROME_PATH || CHROME_PATHS.find((p) => existsSync(p));
  if (!executablePath) throw new Error('Chrome was not found. Set CHROME_PATH to chrome.exe.');
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--mute-audio', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--hide-scrollbars', '--no-first-run', '--disable-extensions']
  });
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  const problems = [];
  page.on('pageerror', (err) => problems.push(`page error: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') problems.push(`console error: ${msg.text()}`);
  });
  page.on('requestfailed', (req) => {
    // a music tune that was still streaming when the page closed or moved on is normal, not a problem
    if (req.failure()?.errorText === 'net::ERR_ABORTED' && /\.(ogg|mp3|wav)$/.test(req.url())) return;
    problems.push(`request failed: ${req.url()}`);
  });

  // Tests skip the first-run start screen unless they are about it.
  const q = startScreen || /nostart/.test(query) ? query : `${query}${query.includes('?') ? '&' : '?'}nostart`;
  const url = base + q;
  if (storage === 'clean') {
    // Start from an empty save, then load the real page.
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => localStorage.clear());
  }
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__GAME_DEBUG__?.scene?.sys?.isActive?.(), { timeout: 60000 }).catch(() => {});

  const game = {
    page,
    problems,
    async wait(ms) { await new Promise((r) => setTimeout(r, ms)); },
    async press(key, holdMs = 60) {
      await page.keyboard.down(key);
      await game.wait(holdMs);
      await page.keyboard.up(key);
      await game.wait(60);
    },
    async hold(key, ms) {
      await page.keyboard.down(key);
      await game.wait(ms);
      await page.keyboard.up(key);
    },
    /** Click at screen pixels (x, y). */
    async click(x, y) {
      await page.mouse.move(x, y);
      await page.mouse.down();
      await game.wait(60);
      await page.mouse.up();
      await game.wait(80);
    },
    eval: (fn, ...args) => page.evaluate(fn, ...args),
    async shot(path) { await page.screenshot({ path }); },
    async close() { await browser.close(); }
  };
  return game;
}
