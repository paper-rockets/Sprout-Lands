// Pictures of Baker Bun's bakery: the room, the oven screen and the shop screen (dev server must be running).
//
//   node scripts/tools/bakery-shots.mjs [folder]      (default: map-drafts/)

import { openGame } from './browser.mjs';

const out = process.argv[2] || 'map-drafts';
const game = await openGame('?room=baker-house', { width: 1280, height: 720 });
await game.wait(1500);
// Some things in the bag so the screens have something to show.
await game.eval(() => {
  const { scene } = window.__GAME_DEBUG__;
  scene.session.change((s) => {
    Object.assign(s.bag, { 'veg-wheat': 3, egg: 2, 'egg-blue': 1, apple: 2, raspberry: 1, honey: 1, 'veg-carrot': 2 });
    s.coins = 12;
  });
});
await game.hold('ArrowUp', 350);
await game.hold('ArrowRight', 600);
await game.hold('ArrowUp', 500);
await game.wait(300);
await game.shot(`${out}/shot-bakery-room.png`);
await game.eval(() => window.__UI_DEBUG__.open('cook'));
await game.wait(500);
await game.shot(`${out}/shot-bakery-oven.png`);
await game.eval(() => window.__UI_DEBUG__.open('shop', { data: { shop: 'bakery' } }));
await game.wait(500);
await game.shot(`${out}/shot-bakery-shop.png`);
console.log(game.problems.length ? game.problems.join('\n') : 'no errors');
await game.close();
