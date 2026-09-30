// Offline test at phone size against the running preview (npm run preview, port 8190):
// load once online, tap once so sound may play, cut the network, reload, and check the start
// screen shows and the nature sounds (the looping breeze) play from the offline copy.
//
//   node scripts/tools/offline-phone-check.mjs [screenshot.png]

import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const BASE = 'http://localhost:8190/';
const executablePath = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find((p) => existsSync(p));
const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--mute-audio', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--hide-scrollbars', '--autoplay-policy=no-user-gesture-required'] });
let failures = 0;
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) failures += 1;
};
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1089, height: 490, deviceScaleFactor: 1 });
  const problems = [];
  page.on('pageerror', (e) => problems.push(`page error: ${e.message}`));
  page.on('requestfailed', (r) => problems.push(`request failed: ${r.url()}`));
  const started = () => page.waitForFunction(() => window.__GAME_DEBUG__?.scene?.sys?.isActive?.(), { timeout: 60000 }).then(() => true).catch(() => false);

  await page.goto(BASE, { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  check(await started(), 'online: the game starts (start screen, no ?nostart)');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    for (let i = 0; i < 120 && !navigator.serviceWorker.controller; i += 1) await new Promise((r) => setTimeout(r, 500));
  });
  await page.reload({ waitUntil: 'load' }); // now controlled by the offline helper
  await started();
  await page.mouse.click(545, 245); // the first tap lets the browser play sound
  await new Promise((r) => setTimeout(r, 4000));
  const sound = () => page.evaluate(() => {
    const a = window.__SPROUT__?.registry.get('audio');
    return { bed: a?.nature?.bed?.bedId || null, playing: Boolean(a?.nature?.bed?.isPlaying), loaded: Boolean(a?.game.cache.audio.exists('sfx-tap')) };
  });
  const online = await sound();
  check(online.playing && online.loaded, `online: the sounds load and the nature loop plays (${JSON.stringify(online)})`);
  const cached = await page.evaluate(async () => {
    const cache = await caches.open((await caches.keys())[0]);
    return (await cache.keys()).map((r) => r.url).filter((u) => u.includes('/audio/')).length;
  });
  console.log(`     sounds in the offline copy: ${cached}`);

  await page.setOfflineMode(true);
  await page.reload({ waitUntil: 'load' });
  check(await started(), 'offline: the game starts again');
  await new Promise((r) => setTimeout(r, 2000));
  const start = await page.evaluate(() => {
    const s = window.__GAME_DEBUG__.scene.scene.get('UIScene') || window.__GAME_DEBUG__.scene.scene.manager.getScene('UIScene');
    return { open: s?.panel?.name || s?.current || null };
  });
  console.log(`     ui state: ${JSON.stringify(start)}`);
  await page.mouse.click(545, 245);
  await new Promise((r) => setTimeout(r, 4000));
  const offline = await sound();
  check(offline.playing && offline.loaded, `offline: the sounds load and the nature loop plays (${JSON.stringify(offline)})`);
  if (process.argv[2]) await page.screenshot({ path: process.argv[2] });
  const real = problems;
  check(real.length === 0, `no errors while offline${real.length ? ': ' + real.join(' | ') : ''}`);
} finally {
  await browser.close();
}
console.log(failures ? `\n${failures} check(s) failed` : '\noffline phone check passed');
process.exit(failures ? 1 : 0);
