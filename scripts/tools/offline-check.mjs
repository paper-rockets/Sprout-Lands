// Proves the built game (dist/) installs and plays offline: serves dist/ on port 8191,
// opens it in headless Chrome, waits for the offline copy, cuts the network, reloads,
// and checks the game still starts. Run `npm run build` first.
//
//   node scripts/tools/offline-check.mjs [screenshot.png]

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { ROOT } from './node-content.mjs';

const DIST = path.join(ROOT, 'dist');
const PORT = 8191;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff2': 'font/woff2', '.map': 'application/json' };

const server = http.createServer((req, res) => {
  let file = path.join(DIST, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (file.endsWith(path.sep) || file === DIST) file = path.join(file, 'index.html');
  if (!file.startsWith(DIST) || !fs.existsSync(file)) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(PORT, r));

let failures = 0;
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) failures += 1;
};
const executablePath = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find((p) => fs.existsSync(p));
const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--mute-audio', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  const url = `http://localhost:${PORT}/?nostart`;
  await page.goto(url, { waitUntil: 'load' });
  const booted = () => page.waitForFunction(() => window.__GAME_DEBUG__?.scene?.sys?.isActive?.(), { timeout: 60000 }).then(() => true).catch(() => false);
  check(await booted(), 'the built game starts online');
  const manifest = await page.evaluate(() => fetch('./manifest.webmanifest').then((r) => r.json()));
  check(manifest.icons?.some((i) => i.sizes === '512x512') && manifest.icons.some((i) => i.sizes === '192x192'), `install info has 192 and 512 icons ("${manifest.name}")`);
  const ready = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    for (let i = 0; i < 120 && !navigator.serviceWorker.controller; i += 1) await new Promise((r) => setTimeout(r, 500));
    const keys = await caches.keys();
    const cache = await caches.open(keys.find((k) => k.includes('-')));
    return { active: Boolean(reg.active), controlled: Boolean(navigator.serviceWorker.controller), keys, files: (await cache.keys()).length };
  });
  check(ready.active && ready.controlled, 'the offline helper is running');
  check(ready.files > 100, `offline copy holds ${ready.files} files (${ready.keys.join(', ')})`);

  await page.setOfflineMode(true);
  await page.reload({ waitUntil: 'load' });
  check(await booted(), 'with the internet cut, the game still starts');
  await new Promise((r) => setTimeout(r, 2500));
  const frames = await page.evaluate(() => window.__GAME_DEBUG__.scene.game.loop.frame);
  check(frames > 30, `and keeps running (${frames} frames drawn)`);
  if (process.argv[2]) await page.screenshot({ path: process.argv[2] });
} finally {
  await browser.close();
  server.close();
}
console.log(failures ? `\n${failures} check(s) failed` : '\noffline check passed');
process.exit(failures ? 1 : 0);
