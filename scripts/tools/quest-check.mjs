// Plays "Help the Baby Chicks Find Mom" and then "Lost in the Forest" (positions are counted inside the farm, so moving the farm is fine) from start to end in headless Chrome, checks the
// saved state at each step, and that the game picks up where it left off after a reload.
// Screenshots go to the folder given as the first argument (default: the system temp folder).
//
//   npm run dev            (in another terminal)
//   node scripts/tools/quest-check.mjs [screenshot folder]

import { openGame } from './browser.mjs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const OUT = process.argv[2] || tmpdir();
const QUEST = 'chicks-home';
const CHICKS = ['chick-pip', 'chick-nutmeg', 'chick-rosie'];
let failures = 0;
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) failures += 1;
};

/** Put the player right next to a person or animal (by id), a little to its left. */
async function standBy(game, id) {
  await game.eval((who) => {
    const s = window.__GAME_DEBUG__.scene;
    const c = s.creatures.byId.get(who);
    const target = c ? { x: c.x, y: c.y } : (s.npcs.find((n) => n.def.id === who) || s.things.find((t) => t.def.id === who)).sprite;
    c?.pause(true);
    s.player.x = target.x - 12;
    s.player.y = target.y;
    s.playerSprite.setPosition(s.player.x, s.player.y);
  }, id);
  await game.wait(250);
}

/** Press the use key, then click through the speech box until it closes. */
async function talk(game) {
  await game.press('e');
  await game.wait(300);
  for (let i = 0; i < 20; i += 1) {
    const open = await game.eval(() => window.__UI_DEBUG__.dialogue.active);
    if (!open) break;
    await game.press('Space');
    await game.wait(700); // lets the words type out
    await game.press('Space');
  }
  await game.wait(200);
}

const state = (game) => game.eval(() => {
  const s = window.__GAME_DEBUG__.scene.session.state;
  return { quest: s.quests['chicks-home'] || null, followers: [...s.followers], entities: s.entities, stars: s.stars, hearts: s.hearts, coins: s.coins, diamond: s.bag.diamond || 0, endingSeen: s.endingSeen };
});

// ---- 1. Meet Mama Hen: the quest starts.
let game = await openGame('', { width: 1280, height: 720 });
await game.wait(1500);
check(await game.eval(() => window.__GAME_DEBUG__.scene.npcs.find((n) => n.def.id === 'mama-hen').emote === 'exclaim'), 'Mama Hen shows "!" before the quest');
await standBy(game, 'mama-hen');
await game.press('e');
await game.wait(900);
await game.shot(join(OUT, 'quest-1-mama.png'));
await talk(game);
let st = await state(game);
check(st.quest?.status === 'active' && st.quest.step === 1, `quest started and on "find the chicks" (${JSON.stringify(st.quest)})`);
check(await game.eval(() => window.__GAME_DEBUG__.scene.npcs.find((n) => n.def.id === 'mama-hen').emote === null), 'the "!" is gone once the quest has started');
const goal = await game.eval(() => window.__UI_DEBUG__.hud.goalText.text);
check(/0 OF 3/.test(goal), `goal note counts the chicks: "${goal}"`);

// ---- 2. Find two chicks, then reload: they should still be following.
for (const id of CHICKS.slice(0, 2)) {
  await standBy(game, id);
  await talk(game);
}
st = await state(game);
check(st.followers.length === 2, `two chicks following (${st.followers})`);
await game.page.reload({ waitUntil: 'domcontentloaded' });
await game.page.waitForFunction(() => window.__GAME_DEBUG__?.scene?.sys?.isActive?.(), { timeout: 60000 });
await game.wait(1500);
st = await state(game);
check(st.followers.length === 2 && st.quest.step === 1, 'after a reload the two chicks are still following');
check(await game.eval(() => ['chick-pip', 'chick-nutmeg'].every((id) => Boolean(window.__GAME_DEBUG__.scene.creatures.byId.get(id).guide))), 'and they trot behind the player again');

// ---- 3. The last chick, then a walk so they line up behind.
await standBy(game, CHICKS[2]);
await talk(game);
st = await state(game);
check(st.quest.step === 2 && st.followers.length === 3, `all three found, now "take them home" (step ${st.quest.step})`);
await game.eval(() => {
  const s = window.__GAME_DEBUG__.scene;
  const farm = s.world.regions.find((r) => r.id === 'farm');
  s.player.x = (farm.ox + 28) * 16 + 8; s.player.y = (farm.oy + 21) * 16; s.playerSprite.setPosition(s.player.x, s.player.y);
});
await game.hold('ArrowRight', 1200);
await game.hold('ArrowDown', 500);
await game.wait(300);
await game.shot(join(OUT, 'quest-2-parade.png'));

// ---- 4. Walk into the coop: Mama Hen thanks you and the prize arrives (the ending waits for the forest quest).
await game.eval(() => {
  const s = window.__GAME_DEBUG__.scene;
  const farm = s.world.regions.find((r) => r.id === 'farm');
  s.player.x = (farm.ox + 14) * 16 + 8; s.player.y = (farm.oy + 22) * 16; s.playerSprite.setPosition(s.player.x, s.player.y);
});
await game.hold('ArrowLeft', 500);
await game.wait(900);
await game.shot(join(OUT, 'quest-3-home.png'));
await talk(game);
await game.wait(600);
st = await state(game);
check(st.quest.status === 'completed', 'quest completed');
check(st.stars === 1 && st.hearts >= 3 && st.coins >= 10 && st.diamond === 1, `prize given: star ${st.stars}, hearts ${st.hearts}, coins ${st.coins}, diamond ${st.diamond}`);
check(CHICKS.every((id) => st.entities[id]?.status === 'home'), 'chicks are home');
check(await game.eval(() => window.__UI_DEBUG__.modalName !== 'ending'), 'no ending yet: the forest quest is still to do');
await game.shot(join(OUT, 'quest-5-after.png'));
const journal = await game.eval(() => window.__GAME_DEBUG__.scene.session.rules.journal());
check(journal.length === 1 && journal[0].done, 'journal shows the quest as done');
check(/PUDDING|SKY|GARDENER/i.test(await game.eval(() => window.__UI_DEBUG__.hud.goalText.text)), 'the goal note now points to Pudding in the woods');
// Busy Bees, the village picnic and the mine crystals are played elsewhere (a unit test, npm run check:bakery, npm run check:rooms);
// finish them here so the ending can open after the forest quest.
await game.eval(() => {
  const r = window.__GAME_DEBUG__.scene.session.rules;
  r.interact('gardener', {});
  for (const id of ['a', 'b', 'c', 'd', 'e']) r.plantWatered(id, {});
  r.honeyGathered({});
  r.interact('gardener', {});
  r.interact('baker-bun', {});
  Object.assign(r.state.bag, { 'food-bun': 1, 'food-pie': 1, 'food-cake': 1 });
  r.interact('village-picnic', {});
  r.interact('picnic-bun', {});
  r.interact('east-miner', {});
  for (const id of ['mine-crystal-1', 'mine-crystal-2', 'mine-crystal-3']) r.interact(id, {});
  r.interact('east-miner', {});
});

// ---- 5. Lost in the Forest: meet Pudding, find three clues, the Imp appears and follows you home.
const forest = (game) => game.eval(() => {
  const s = window.__GAME_DEBUG__.scene;
  const imp = s.npcs.find((n) => n.def.id === 'forest-imp');
  return { quest: s.session.state.quests['lost-in-forest'] || null, clues: [...s.session.state.clues], followers: [...s.session.state.followers], impVisible: imp.sprite.visible, stars: s.session.state.stars, emerald: s.session.state.bag.emerald || 0 };
});
check((await forest(game)).impVisible === false, 'the Imp is hidden before the clues');
let cove;
check(await game.eval(() => {
  const s = window.__GAME_DEBUG__.scene;
  const w = s.world.regions.find((r) => r.id === 'woods');
  return s.world.isBlocked(w.ox + 6, w.oy + 31);
}), 'the bridge to the secret cove is blocked by the log at first');
await standBy(game, 'forest-pudding');
await game.press('e');
await game.wait(900);
await game.shot(join(OUT, 'forest-1-pudding.png'));
await talk(game);
let fs = await forest(game);
check(fs.quest?.status === 'active' && fs.quest.step === 1, `forest quest started, looking for clues (${JSON.stringify(fs.quest)})`);
const CLUES = ['forest-basket', 'forest-mushrooms', 'forest-footprints'];
await standBy(game, CLUES[1]);
await game.shot(join(OUT, 'forest-2-clue.png'));
for (const id of CLUES) {
  await standBy(game, id);
  await talk(game);
}
fs = await forest(game);
check(fs.clues.length === 3 && fs.quest.step === 2, `all three clues found (${fs.clues})`);
check(fs.impVisible, 'the Imp has appeared in the clearing');
await standBy(game, 'forest-imp');
await game.wait(400);
await game.shot(join(OUT, 'forest-3-imp.png'));
await talk(game);
fs = await forest(game);
check(fs.followers.includes('forest-imp') && fs.quest.step === 3, 'the Imp follows the player');
// walk down the trail from the clearing towards the cottage, then the last few steps to Pudding
await game.eval(() => {
  const s = window.__GAME_DEBUG__.scene;
  const w = s.world.regions.find((r) => r.id === 'woods');
  s.player.x = (w.ox + 20) * 16 + 8; s.player.y = (w.oy + 10) * 16; s.playerSprite.setPosition(s.player.x, s.player.y);
});
await game.hold('ArrowDown', 900);
await game.wait(300);
await game.shot(join(OUT, 'forest-4-walk.png'));
await game.eval(() => {
  const s = window.__GAME_DEBUG__.scene;
  const w = s.world.regions.find((r) => r.id === 'woods');
  s.player.x = (w.ox + 19) * 16 + 8; s.player.y = (w.oy + 17) * 16; s.playerSprite.setPosition(s.player.x, s.player.y);
});
await game.hold('ArrowLeft', 700);
await game.wait(900);
await talk(game);
await game.wait(600);
fs = await forest(game);
check(fs.quest.status === 'completed' && fs.stars === 5 && fs.emerald === 1, `forest quest done (with the bees, the picnic and the crystals): stars ${fs.stars}, emerald ${fs.emerald}`);
check(await game.eval(() => window.__UI_DEBUG__.modalName === 'ending'), 'all quests done: the ending screen opened');
const coveOpen = () => game.eval(() => {
  const s = window.__GAME_DEBUG__.scene;
  const w = s.world.regions.find((r) => r.id === 'woods');
  const log = s.things.find((t) => t.def.id === 'woods-cove-log');
  return { walkable: !s.world.isBlocked(w.ox + 6, w.oy + 31) && !s.world.isBlocked(w.ox + 7, w.oy + 31), logVisible: log.sprite.visible };
});
cove = await coveOpen();
check(cove.walkable && !cove.logVisible, 'the mossy log is gone and the bridge to the secret cove can be crossed');
await game.shot(join(OUT, 'quest-4-ending.png'));
await game.eval(() => window.__UI_DEBUG__.closeModal());
await game.wait(400);
await game.shot(join(OUT, 'forest-5-home.png'));

// ---- 6. After a reload the chicks stay with Mama Hen, the Imp with Pudding, and the ending does not come back.
await game.page.reload({ waitUntil: 'domcontentloaded' });
await game.page.waitForFunction(() => window.__GAME_DEBUG__?.scene?.sys?.isActive?.(), { timeout: 60000 });
await game.wait(1500);
const near = await game.eval(() => {
  const s = window.__GAME_DEBUG__.scene;
  const mama = s.creatures.byId.get('mama-hen');
  return ['chick-pip', 'chick-nutmeg', 'chick-rosie'].map((id) => Math.round(Math.hypot(s.creatures.byId.get(id).x - mama.x, s.creatures.byId.get(id).y - mama.y)));
});
check(near.every((d) => d < 40), `after a reload the chicks are next to Mama Hen (${near} px)`);
const impNear = await game.eval(() => {
  const s = window.__GAME_DEBUG__.scene;
  const imp = s.npcs.find((n) => n.def.id === 'forest-imp').sprite;
  const pud = s.npcs.find((n) => n.def.id === 'forest-pudding').sprite;
  return Math.round(Math.hypot(imp.x - pud.x, imp.y - pud.y));
});
check(impNear < 30, `and the Imp is at home next to Pudding (${impNear} px)`);
cove = await coveOpen();
check(cove.walkable && !cove.logVisible, 'after a reload the secret cove stays open');
check(await game.eval(() => window.__UI_DEBUG__.modalName !== 'ending'), 'the ending does not open again');

check(game.problems.length === 0, `no errors in the page${game.problems.length ? ': ' + game.problems.join(' | ') : ''}`);
await game.close();
console.log(failures ? `\n${failures} check(s) failed` : '\nall quest checks passed');
process.exit(failures ? 1 : 0);
