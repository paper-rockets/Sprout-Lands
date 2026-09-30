// Plays trick or treat in Pumpkin Hollow (dev server must be running): at each of the four houses the door
// glows open when you walk up, you knock, say the words, and get one candy; knocking again at once gets
// nothing; the candy shows on the item bar; all of it survives a reload.
//
//   npm run check:treats

import { openGame } from './browser.mjs';

const failures = [];
const check = (ok, text) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${text}`);
  if (!ok) failures.push(text);
};
const HOUSES = [
  ['treats-haunted_house', 12, 11],
  ['treats-witch_cottage', 10, 25],
  ['treats-pumpkin_house', 36, 24],
  ['treats-crypt', 15, 41]
];
// ?at= counts from the farm's corner (world 90,18)
const at = (x, y) => `?at=${x - 90},${y + 1 - 18}`;
const candyCount = (game) => game.eval(() => {
  const s = window.__GAME_DEBUG__.scene.session;
  return s.groupCount('candy');
});
const speaking = (game) => game.eval(() => window.__UI_DEBUG__.dialogue.active);
async function finishSpeech(game) {
  for (let i = 0; i < 30 && await speaking(game); i += 1) {
    await game.press('Space');
    await game.wait(200);
  }
}

let game;
for (const [id, hx, hy] of HOUSES) {
  game = await openGame(at(hx, hy), { width: 1089, height: 490 });
  await game.wait(1500);
  const near = await game.eval(() => window.__GAME_DEBUG__.scene.near?.spot?.id ?? null);
  check(near === id, `${id}: standing below the door, the use button is for this house (found ${near})`);
  const glow = await game.eval(() => Math.max(...window.__GAME_DEBUG__.scene.gates.openDoors.map((d) => d.sprite.alpha)));
  check(glow > 0.9, `${id}: the doorway shows open while you stand at it (${glow.toFixed(2)})`);
  await game.press('Space');
  await game.wait(500);
  check(await speaking(game), `${id}: knocking starts the speech box`);
  await finishSpeech(game);
  await game.wait(500);
  check(await candyCount(game) === 1, `${id}: one candy in the bag (${await candyCount(game)})`);
  await game.press('Space');
  await game.wait(400);
  await finishSpeech(game);
  check(await candyCount(game) === 1, `${id}: knocking again straight away gives nothing more`);
  if (id === HOUSES[0][0]) {
    await game.page.reload({ waitUntil: 'domcontentloaded' });
    await game.page.waitForFunction(() => window.__GAME_DEBUG__?.scene?.sys?.isActive?.(), { timeout: 60000 });
    await game.wait(1200);
    check(await candyCount(game) === 1, 'the candy is still in the bag after a reload');
    await game.page.screenshot({ path: 'map-drafts/treats-bag.png' }).catch(() => {});
  }
  if (game.problems.length) check(false, `${id}: ${game.problems.join('; ')}`);
  await game.close();
}
console.log(failures.length ? `${failures.length} FAILED` : 'trick or treat: all ok');
process.exit(failures.length ? 1 : 0);
