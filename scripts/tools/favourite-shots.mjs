// Pictures of a friend getting their favourite treat (Mittens and honey toast), and the journal's
// favourite treats page (dev server must be running).
//
//   node scripts/tools/favourite-shots.mjs [folder]      (default: map-drafts/)

import { openGame } from './browser.mjs';

const out = process.argv[2] || 'map-drafts';
// Mittens sits at farm 20,16; stand just to her right.
const game = await openGame('?at=21,16', { width: 1280, height: 720 });
await game.wait(4000); // the "You found Sunny Farm" sign goes away
await game.eval(() => {
  const { scene } = window.__GAME_DEBUG__;
  scene.session.change((s) => {
    Object.assign(s.bag, { 'food-toast': 1, 'food-bread': 2 });
  });
});
await game.hold('ArrowLeft', 80);
await game.wait(300);
await game.eval(() => window.__GAME_DEBUG__.scene.interact());
await game.wait(1700);
await game.shot(`${out}/shot-favourite-treat.png`);
// Through the thank-you and the gift line, then the journal's last tab.
for (let i = 0; i < 4; i += 1) {
  await game.press('Space');
  await game.wait(400);
}
await game.eval(() => {
  const ui = window.__UI_DEBUG__;
  ui.open('journal');
});
await game.wait(400);
await game.eval(() => {
  const panel = window.__GAME_DEBUG__.scene.scene.get('ui').modal;
  panel?.select?.(panel.pages.length - 1);
});
await game.wait(400);
await game.shot(`${out}/shot-favourite-journal.png`);
const state = await game.eval(() => {
  const s = window.__GAME_DEBUG__.scene.session.state;
  return { coins: s.coins, fed: s.fed['cat-mittens'], likes: s.likes };
});
console.log(JSON.stringify(state));
console.log(game.problems.length ? game.problems.join('\n') : 'no errors');
await game.close();
