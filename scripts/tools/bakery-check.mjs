// Plays the bakery and the village picnic in headless Chrome (dev server must be running):
// tap the counter and buy a pie, tap the oven and cook a bun, reload (coins, food and the spot inside
// are kept), "less motion" stops the oven's fire, then take the food to the picnic blanket and finish.
//
//   npm run check:bakery            (pictures go to map-drafts/ with --shots)

import { openGame } from './browser.mjs';

const shots = process.argv.includes('--shots');
const failures = [];
const check = (ok, text) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${text}`);
  if (!ok) failures.push(text);
};

/** Screen pixels of a spot in the world (the game camera) or of a UI widget's middle (the UI camera). */
const worldToScreen = (game, x, y) => game.eval(([wx, wy]) => {
  const cam = window.__GAME_DEBUG__.scene.cameras.main;
  return [(wx - cam.worldView.x) * cam.zoom, (wy - cam.worldView.y) * cam.zoom];
}, [x, y]);
const widgetMiddle = (game, find) => game.eval((source) => {
  const ui = window.__UI_DEBUG__;
  const widget = new Function('modal', `return (${source})(modal);`)(ui.modal);
  const b = widget.getBounds();
  return [b.centerX * ui.scaleFactor, b.centerY * ui.scaleFactor];
}, find.toString());
const clickWidget = async (game, find) => {
  const [x, y] = await widgetMiddle(game, find);
  await game.click(x, y);
  await game.wait(250);
};
/** Tap a thing in the world (the counter, the oven, the blanket) and wait until the walk there is over. */
async function tapThing(game, id) {
  const spot = await game.eval((thingId) => {
    const t = window.__GAME_DEBUG__.scene.things.find((th) => th.def.id === thingId);
    return [t.sprite.x, t.sprite.y - 6];
  }, id);
  const [x, y] = await worldToScreen(game, ...spot);
  await game.click(x, y);
  for (let i = 0; i < 40; i += 1) {
    await game.wait(150);
    if (await game.eval(() => Boolean(window.__UI_DEBUG__.modal || window.__UI_DEBUG__.dialogue.active))) return;
  }
}
const state = (game) => game.eval(() => {
  const s = window.__GAME_DEBUG__.scene.session.state;
  return { coins: s.coins, bag: { ...s.bag }, player: { ...s.player }, quests: JSON.parse(JSON.stringify(s.quests)) };
});
async function finishSpeech(game) {
  for (let i = 0; i < 30 && await game.eval(() => window.__UI_DEBUG__.dialogue.active); i += 1) {
    await game.press('Space');
    await game.wait(200);
  }
}

const game = await openGame('?room=baker-house', { width: 1280, height: 720 });
await game.wait(1200);
await game.eval(() => window.__GAME_DEBUG__.scene.session.change((s) => {
  Object.assign(s.bag, { 'veg-wheat': 2, egg: 3, honey: 1 });
  s.coins = 12;
}));

// 1. The counter: a tap walks over and opens the shop; buy a fruit pie.
await tapThing(game, 'baker-counter');
check(await game.eval(() => window.__UI_DEBUG__.modalName) === 'shop', 'tapping the counter opens the shop');
await clickWidget(game, (m) => m.tiles.find((t) => t.item === 'food-pie'));
await clickWidget(game, (m) => m.action);
let s = await state(game);
check(s.coins === 7 && s.bag['food-pie'] === 1, `bought a pie for 5 coins (coins ${s.coins}, pies ${s.bag['food-pie']})`);
await clickWidget(game, (m) => m.tiles.find((t) => t.item === 'food-cake'));
await clickWidget(game, (m) => m.action);
s = await state(game);
check(s.coins === 7 && !s.bag['food-cake'], 'a cake (8) costs more than the 7 coins left: nothing happens, coins stay 7');
await game.press('Escape');
await game.wait(300);

// 2. The oven: cook a bun.
await tapThing(game, 'baker-oven');
check(await game.eval(() => window.__UI_DEBUG__.modalName) === 'cook', 'tapping the oven opens the cooking screen');
await clickWidget(game, (m) => m.tiles[m.recipes.findIndex((r) => r.id === 'bun')]);
await clickWidget(game, (m) => m.cookButton);
s = await state(game);
check(s.bag['food-bun'] === 1 && s.bag['veg-wheat'] === 1 && s.bag.egg === 2, 'cooked a bun from a wheat and an egg');
if (shots) await game.shot('map-drafts/shot-bakery-cooked.png');
await game.press('Escape');
await game.wait(300);

// 3. Reload: coins, food and the spot inside the bakery are kept.
const before = await state(game);
await game.page.reload({ waitUntil: 'domcontentloaded' });
await game.page.waitForFunction(() => window.__GAME_DEBUG__?.scene?.sys?.isActive?.(), { timeout: 60000 });
await game.wait(1200);
s = await state(game);
check(s.coins === 7 && s.bag['food-bun'] === 1 && s.bag['food-pie'] === 1, 'after a reload the coins and the food are still there');
check(s.player.room === 'baker-house' && Math.abs(s.player.roomX - before.player.roomX) < 1, 'after a reload the player is still in the bakery, same spot');

// 4. "Less motion" holds the oven's fire still.
const fire = () => game.eval(() => window.__GAME_DEBUG__.scene.animated.map((a) => a.anims.isPaused));
check((await fire()).every((p) => !p), 'the oven fire moves');
await game.eval(() => window.__GAME_DEBUG__.scene.session.change((st) => { st.settings.reducedMotion = true; }));
check((await fire()).every((p) => p), 'with "less motion" the oven fire holds still');
await game.eval(() => window.__GAME_DEBUG__.scene.session.change((st) => { st.settings.reducedMotion = false; }));

// 5. The picnic quest: Baker Bun asks, the cake is cooked, the food goes on the blanket.
await game.eval(() => {
  const scene = window.__GAME_DEBUG__.scene;
  const bun = scene.npcs.find((n) => n.def.id === 'baker-bun');
  scene.near = { kind: 'npc', npc: bun };
  scene.interact();
});
await finishSpeech(game);
s = await state(game);
check(s.quests['village-picnic']?.status === 'active', 'Baker Bun starts the village picnic');
await tapThing(game, 'baker-oven');
await clickWidget(game, (m) => m.tiles[m.recipes.findIndex((r) => r.id === 'cake')]);
await clickWidget(game, (m) => m.cookButton);
s = await state(game);
check(s.bag['food-cake'] === 1, 'cooked a honey cake');
await game.press('Escape');
await game.eval(() => window.__UI_DEBUG__.open('journal'));
await game.wait(300);
check(await game.eval(() => window.__UI_DEBUG__.modalName) === 'journal', 'the journal opens with the picnic in it');
if (shots) await game.shot('map-drafts/shot-bakery-journal.png');
await game.press('Escape');

// Outside by the pond (the same browser, so the save is kept). ?at counts from the farm: east (31,44) is (91,26).
const outside = game;
await game.page.goto('http://localhost:8190/?at=91,26&nostart', { waitUntil: 'domcontentloaded' });
await game.page.waitForFunction(() => window.__GAME_DEBUG__?.scene?.sys?.isActive?.(), { timeout: 60000 });
await outside.wait(1500);
await tapThing(outside, 'village-picnic');
await finishSpeech(outside);
s = await state(outside);
check(s.quests['village-picnic']?.step === 2 && !s.bag['food-cake'], 'the food goes on the blanket');
check(await outside.eval(() => window.__GAME_DEBUG__.scene.npcs.find((n) => n.def.id === 'picnic-bun').sprite.visible), 'Baker Bun comes to the picnic');
await outside.eval(() => {
  const scene = window.__GAME_DEBUG__.scene;
  scene.near = { kind: 'npc', npc: scene.npcs.find((n) => n.def.id === 'picnic-bun') };
  scene.interact();
});
await outside.wait(400);
if (shots) await outside.shot('map-drafts/shot-picnic-done.png');
await finishSpeech(outside);
s = await state(outside);
check(s.quests['village-picnic']?.status === 'completed' && s.bag['food-muffin'] === 2, 'the picnic is done: prize of two muffins');
for (const p of game.problems) failures.push(p);
if (game.problems.length) console.log(game.problems.join('\n'));
await game.close();
console.log(failures.length ? `\n${failures.length} problem(s)` : '\nbakery check passed');
process.exit(failures.length ? 1 : 0);
