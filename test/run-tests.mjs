// The game's own tests, run with `npm test`. No browser needed: the quest rules and the
// save code are plain JavaScript. (Tests that drive the real game in Chrome are
// `npm run check:ui` and `npm run check:quest`, with the dev server running.)

import assert from 'node:assert/strict';
import { checkContent } from '../src/engine/content/checkContent.js';
import { GameRules, createInitialState } from '../src/engine/rules/GameRules.js';
import * as Kitchen from '../src/engine/rules/Kitchen.js';
import { SaveStore, saveKey } from '../src/engine/state/SaveStore.js';
import { buildWorld } from '../src/engine/world/worldModel.js';
import { loadContentFromDisk } from '../scripts/tools/node-content.mjs';

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`ok    ${name}`);
  } catch (e) {
    failed += 1;
    console.log(`FAIL  ${name}\n      ${e.message.split('\n').join('\n      ')}`);
  }
}

const content = loadContentFromDisk();

/** A pretend browser storage, so saves can be tested in Node. */
function memoryStorage() {
  const data = new Map();
  return { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v)), removeItem: (k) => data.delete(k), data };
}

/** The tile an entity stands on, in world tiles (what the scene passes the rules as ctx.tile). */
function tileOf(id) {
  const { entity, region } = content.entityIndex[id];
  return { x: region.ox + entity.at[0], y: region.oy + entity.at[1] };
}
const ctxAt = (id) => ({ area: content.entityIndex[id].region.id, tile: tileOf(id) });
const far = { area: 'farm', tile: { x: -50, y: -50 } };
const MINE_CRYSTALS = ['mine-crystal-1', 'mine-crystal-2', 'mine-crystal-3'];

/** Save and load the state the way the game does, to prove nothing is lost in between. */
function reload(state) {
  const storage = memoryStorage();
  const store = new SaveStore(content, storage);
  store.save(state);
  return new SaveStore(content, storage).load();
}

/* ---------------- content ---------------- */

test('the content check finds no problems (every name is real, nothing is out of reach)', () => {
  const report = checkContent(content);
  assert.deepEqual(report.errors, []);
});

/* ---------------- the chick quest ---------------- */

const QUEST = 'chicks-home';
const CHICKS = Object.entries(content.entityIndex).filter(([, r]) => (r.entity.tags || []).includes('chick')).map(([id]) => id);

test('there are three lost chicks', () => assert.equal(CHICKS.length, 3));

test('chick quest: start, find the chicks, save and reload in the middle, bring them home, prize once', () => {
  let state = createInitialState(content);
  let rules = new GameRules(content, state);

  let out = rules.interact('mama-hen', ctxAt('mama-hen'));
  assert.equal(rules.questState(QUEST).status, 'active');
  assert.equal(rules.currentStep(QUEST).id, 'find', 'talking to Mama Hen moves straight on to finding the chicks');
  assert.ok(out.lines.length >= 2, 'Mama Hen explains the quest');
  assert.ok(out.notices.some((n) => n.kind === 'quest'), 'a "New quest!" sign');
  assert.match(rules.objectiveText(), /0 of 3/);

  rules.interact(CHICKS[0], far);
  rules.interact(CHICKS[1], far);
  assert.deepEqual(state.followers, CHICKS.slice(0, 2));
  assert.match(rules.objectiveText(), /2 of 3/);

  // Close the game and open it again.
  state = reload(state);
  rules = new GameRules(content, state);
  assert.deepEqual(state.followers, CHICKS.slice(0, 2), 'the chicks are still following after a reload');
  assert.equal(rules.currentStep(QUEST).id, 'find');

  out = rules.interact(CHICKS[2], far);
  assert.equal(rules.currentStep(QUEST).id, 'home', 'three chicks found: now take them home');
  assert.equal(rules.playerMoved(far).changed, false, 'nothing happens far from the coop');

  out = rules.playerMoved(ctxAt('mama-hen'));
  assert.equal(rules.questState(QUEST).status, 'completed');
  assert.ok(CHICKS.every((id) => rules.entityStatus(id) === 'home'), 'all chicks are home');
  assert.deepEqual(state.followers, []);
  assert.equal(state.stars, 1);
  assert.equal(state.coins, 10);
  assert.equal(state.hearts, 3);
  assert.equal(state.bag.diamond, 1);
  assert.ok(out.notices.some((n) => n.kind === 'questDone'));
  assert.ok(rules.allQuestsComplete() || Object.keys(content.quests).length > 1);

  // Nothing gives the prize a second time.
  for (const id of ['mama-hen', ...CHICKS]) rules.interact(id, ctxAt('mama-hen'));
  rules.playerMoved(ctxAt('mama-hen'));
  state = reload(state);
  rules = new GameRules(content, state);
  rules.interact('mama-hen', ctxAt('mama-hen'));
  assert.equal(state.stars, 1);
  assert.equal(state.bag.diamond, 1);
  assert.equal(rules.questState(QUEST).status, 'completed');
});

test('chicks wait where they are until Mama Hen asks for help, then follow', () => {
  const state = createInitialState(content);
  const rules = new GameRules(content, state);
  for (const id of CHICKS) rules.interact(id, far);
  assert.equal(state.followers.length, 0, 'chicks do not follow before the quest has started');
  assert.equal(rules.questState(QUEST).status, 'not_started');
  rules.interact('mama-hen', ctxAt('mama-hen'));
  for (const id of CHICKS) rules.interact(id, far);
  assert.equal(state.followers.length, 3, 'after the quest starts they follow');
});

test('the gardener starts Busy Bees, then gives a hint about the watering', () => {
  const state = createInitialState(content);
  const rules = new GameRules(content, state);
  const first = rules.interact('gardener', far).lines.map((l) => l.text).join(' ');
  assert.match(first, /WATER/);
  assert.equal(rules.questState('busy-bees').status, 'active');
  const hint = rules.interact('gardener', far).lines.map((l) => l.text).join(' ');
  assert.match(hint, /WATERED 0 OF 5/);
});

test('Busy Bees: five different plants watered, honey collected, then back to the gardener', () => {
  const state = createInitialState(content);
  const rules = new GameRules(content, state);
  rules.interact('gardener', far);
  for (const id of ['a', 'b', 'b', 'c', 'd']) rules.plantWatered(id, far);
  assert.equal(rules.currentStep('busy-bees').id, 'water', 'the same plant twice counts once');
  rules.plantWatered('e', far);
  assert.equal(rules.currentStep('busy-bees').id, 'honey');
  assert.equal(rules.wantsHoney(), true);
  rules.honeyGathered(far);
  assert.equal(rules.currentStep('busy-bees').id, 'back');
  rules.interact('gardener', far);
  assert.equal(rules.questState('busy-bees').status, 'completed');
  assert.equal(state.stars, 1);
});

test('the journal lists the quest with its giver, steps so far and prize', () => {
  const state = createInitialState(content);
  const rules = new GameRules(content, state);
  assert.deepEqual(rules.journal(), []);
  rules.interact('mama-hen', ctxAt('mama-hen'));
  const [entry] = rules.journal();
  assert.equal(entry.id, QUEST);
  assert.equal(entry.giver.name, 'Mama Hen');
  assert.equal(entry.steps.length, 2, 'the finished "talk" step and the current one; later steps stay hidden');
  assert.equal(entry.steps[1].need, 3);
  assert.equal(entry.reward.stars, 1);
});

/* ---------------- the forest quest ---------------- */

const FOREST = 'lost-in-forest';
const CLUES = content.quests[FOREST].steps.find((st) => st.type === 'inspectClues').clues;

test('forest quest: clues first, then the lost friend appears, follows you home, prize once', () => {
  let state = createInitialState(content);
  let rules = new GameRules(content, state);
  const imp = content.entityIndex['forest-imp'].entity;
  assert.equal(rules.isPresent(imp), false, 'the lost friend is hidden at the start');
  rules.interact('forest-imp', far);
  assert.deepEqual(state.followers, [], 'and cannot be found before the clues');

  rules.interact('forest-pudding', ctxAt('forest-pudding'));
  assert.equal(rules.currentStep(FOREST).id, 'clues');
  assert.match(rules.objectiveText(), /0 of 3/);
  rules.interact(CLUES[0], far);
  rules.interact(CLUES[1], far);
  state = reload(state); // close the game halfway
  rules = new GameRules(content, state);
  assert.match(rules.objectiveText(), /2 of 3/);
  assert.equal(rules.isPresent(imp), false);

  const out = rules.interact(CLUES[2], far);
  assert.ok(out.lines.some((l) => /SNIFFLE/.test(l.text)), 'a hint that someone is in the clearing');
  assert.equal(rules.isPresent(imp), true, 'the lost friend appears after the third clue');
  assert.equal(rules.currentStep(FOREST).id, 'find');
  rules.interact('forest-imp', far);
  assert.deepEqual(state.followers, ['forest-imp']);
  assert.equal(rules.currentStep(FOREST).id, 'home');

  rules.playerMoved(ctxAt('forest-pudding'));
  assert.equal(rules.questState(FOREST).status, 'completed');
  assert.equal(rules.entityStatus('forest-imp'), 'home');
  assert.equal(rules.isPresent(content.entityIndex['woods-cove-log'].entity), false, 'the mossy log is moved: the secret cove is open');
  assert.equal(state.bag.emerald, 1);
  const stars = state.stars;
  rules.interact('forest-pudding', ctxAt('forest-pudding'));
  rules.playerMoved(ctxAt('forest-pudding'));
  assert.equal(state.stars, stars, 'no second prize');
  assert.equal(state.bag.emerald, 1);
});

test('the secret cove is locked at the start: the log says why', () => {
  const state = createInitialState(content);
  const rules = new GameRules(content, state);
  const log = content.entityIndex['woods-cove-log'].entity;
  assert.equal(rules.isPresent(log), true);
  const out = rules.interact('woods-cove-log', far);
  assert.match(out.lines.map((l) => l.text).join(' '), /MOSSY LOG/);
  assert.ok(out.sounds.includes('locked'));
});

test('forest quest: the clues can be found before meeting Pudding', () => {
  const state = createInitialState(content);
  const rules = new GameRules(content, state);
  for (const c of CLUES) rules.interact(c, far);
  rules.interact('forest-imp', far);
  assert.deepEqual(state.followers, ['forest-imp']);
  rules.interact('forest-pudding', ctxAt('forest-pudding'));
  assert.equal(rules.questState(FOREST).status, 'completed');
});

test('all quests done: the game is complete', () => {
  const state = createInitialState(content);
  const rules = new GameRules(content, state);
  rules.interact('gardener', far);
  for (const id of ['a', 'b', 'c', 'd', 'e']) rules.plantWatered(id, far);
  rules.honeyGathered(far);
  rules.interact('gardener', far);
  rules.interact('mama-hen', ctxAt('mama-hen'));
  for (const id of CHICKS) rules.interact(id, far);
  rules.playerMoved(ctxAt('mama-hen'));
  assert.equal(rules.allQuestsComplete(), false, 'one quest is not the whole game');
  for (const c of CLUES) rules.interact(c, far);
  rules.interact('forest-imp', far);
  rules.interact('forest-pudding', ctxAt('forest-pudding'));
  assert.equal(rules.allQuestsComplete(), false, 'the village picnic is still to do');
  rules.interact('baker-bun', far);
  Object.assign(state.bag, { 'food-bun': 1, 'food-pie': 1, 'food-cake': 1 });
  rules.interact('village-picnic', far);
  rules.interact('picnic-bun', far);
  assert.equal(rules.allQuestsComplete(), false, 'the crystals in the mine are still to find');
  rules.interact('east-miner', far);
  for (const id of MINE_CRYSTALS) rules.interact(id, far);
  rules.interact('east-miner', far);
  assert.equal(rules.allQuestsComplete(), true);
  assert.equal(state.stars, 5);
  assert.match(rules.objectiveText(), /You did it/);
});

test('a lost friend gets another look when the player picked the same character', () => {
  const state = createInitialState(content);
  state.profile.avatarId = 'forest-imp';
  const rules = new GameRules(content, state);
  assert.equal(rules.entityName('forest-imp'), 'Little Tabby');
  assert.equal(rules.speakerFor('forest-imp').portrait, 'tabby-cat');
  assert.match(rules.personalise('{@forest-imp} WENT MISSING'), /^Little Tabby/);
});

/* ---------------- saving ---------------- */

test('two different gift games never share a save', () => {
  const storage = memoryStorage();
  const other = { ...content, config: { ...content.config, gameId: 'someone-else' } };
  const a = new SaveStore(content, storage);
  const b = new SaveStore(other, storage);
  const state = createInitialState(content);
  state.coins = 42;
  a.save(state);
  assert.notEqual(saveKey(content.config.gameId), saveKey('someone-else'));
  assert.equal(b.exists(), false);
  assert.equal(b.load().coins, 0);
  assert.equal(a.load().coins, 42);
});

test('a broken or missing save starts a fresh game instead of crashing', () => {
  const storage = memoryStorage();
  storage.setItem(saveKey(content.config.gameId), '{not json');
  const state = new SaveStore(content, storage).load();
  assert.equal(state.coins, 0);
  assert.deepEqual(state.quests, {});
});

test('rooms: every house room opens from its own door, and the world check sees them all', () => {
  const placed = content.world.rooms.map((p) => p.id);
  for (const id of ['baker-house', 'blue-house', 'pine-cabin']) {
    assert.ok(placed.includes(id), `${id} is placed in world.json`);
    const room = content.rooms[id];
    assert.ok(room.door?.region && room.exit, `${id} has a door and an exit`);
  }
  const bakery = content.rooms['baker-house'];
  assert.ok(bakery.npcs.some((n) => n.id === 'baker-bun'), 'Baker Bun is in the bakery');
  assert.deepEqual(bakery.entities.map((e) => e.kind).sort(), ['oven', 'shop'], 'with an oven and a shop counter');
  const report = checkContent(content);
  assert.deepEqual(report.errors.filter((e) => e.startsWith('room')), []);
});

test('rooms: the world check catches no way out, a trapped corner, a door nobody can reach, and furniture on floor kept free', () => {
  const broken = (change) => {
    const copy = structuredClone(content);
    change(copy);
    return checkContent(copy).errors.join('\n');
  };
  assert.match(broken((c) => { delete c.rooms['baker-house'].exit; }), /baker-house" has no "exit"/);
  // A table next to the bed and the chest shuts the floor tile in the corner (1,3) off from the door.
  assert.match(broken((c) => { c.rooms['pine-cabin'].objects.push({ type: 'table_oak', at: [2, 3] }); }), /pine-cabin": 1 floor tile\(s\) around 1,3 cannot be reached/);
  assert.match(broken((c) => { c.rooms['blue-house'].door.at = [0, 0]; }), /blue-house" can never be walked into/);
  assert.match(broken((c) => {
    c.rooms['blue-house'].reserved = [{ for: 'a later job', at: [3, 3], size: [1, 1] }];
    c.rooms['blue-house'].objects.push({ type: 'table_light', at: [3, 3] });
  }), /kept free for a later job/);
  // The oven and the counter are solid: nobody walks through them.
  const bakery = content.world.rooms.find((p) => p.id === 'baker-house');
  const world = buildWorld(content);
  for (const e of content.rooms['baker-house'].entities) assert.ok(world.isBlocked(bakery.at[0] + e.at[0], bakery.at[1] + e.at[1]), `${e.id} is solid`);
});

/* ---------------- cooking, the shop and the village picnic ---------------- */

test('cooking: a recipe uses up exactly what it needs and puts the food in the bag', () => {
  const state = createInitialState(content);
  state.bag = { 'veg-wheat': 2, egg: 1, 'egg-blue': 2, honey: 1 };
  const rules = new GameRules(content, state);
  const out = rules.cook('cake'); // wheat + 2 eggs + honey
  assert.equal(out.result.ok, true);
  assert.equal(state.bag['food-cake'], 1);
  assert.equal(state.bag['veg-wheat'], 1);
  assert.equal((state.bag.egg || 0) + (state.bag['egg-blue'] || 0), 1, 'two of the three eggs are used, any colour');
  assert.equal(state.bag.honey, undefined, 'used-up things leave the bag');
  assert.ok(out.gained.some((g) => g.item === 'food-cake'), 'the item bar hears about it');
  // Not enough for another cake: nothing is used up.
  const before = JSON.stringify(state.bag);
  assert.equal(rules.cook('cake').result.ok, false);
  assert.equal(JSON.stringify(state.bag), before);
});

test('cooking: "wheat and any vegetable" never uses the same wheat twice; every recipe is makeable', () => {
  const state = createInitialState(content);
  state.bag = { 'veg-wheat': 1 };
  const rules = new GameRules(content, state);
  assert.equal(rules.cook('sandwich').result.ok, false, 'one wheat is not a wheat and a vegetable');
  state.bag['veg-carrot'] = 1;
  assert.equal(rules.cook('sandwich').result.ok, true);
  assert.deepEqual(state.bag, { 'food-sandwich': 1 });
  const plan = Kitchen.plan(content, {}, Kitchen.recipe(content, 'pie'));
  assert.deepEqual(plan.parts.map((p) => [p.have, p.count]), [[0, 1], [0, 2]], 'the oven screen can show what is missing');
  for (const r of Kitchen.recipes(content)) {
    const bag = {};
    for (const need of r.needs) {
      const id = need.item || Object.keys(content.art.items).find((k) => content.art.items[k].group === need.group && !r.needs.some((n) => n.item === k));
      bag[id] = (bag[id] || 0) + (need.count || 1);
    }
    assert.equal(Kitchen.plan(content, bag, r).ok, true, `${r.id} can be made from its own needs`);
  }
});

test('shop: buying needs coins and never goes below zero; selling pays coins; it all survives a reload', () => {
  let state = createInitialState(content);
  let rules = new GameRules(content, state);
  state.coins = 4;
  assert.equal(rules.buy('bakery', 'food-bun').result.ok, true);
  assert.equal(state.coins, 1);
  assert.equal(state.bag['food-bun'], 1);
  const broke = rules.buy('bakery', 'food-cake');
  assert.equal(broke.result.ok, false, 'a cake costs more than 1 coin');
  assert.equal(broke.result.reason, 'coins');
  assert.equal(state.coins, 1, 'coins never go below zero');
  assert.equal(rules.buy('bakery', 'diamond').result.ok, false, 'the bakery does not sell diamonds');
  state.bag.apple = 2;
  assert.deepEqual(Kitchen.sellable(content, state, 'bakery').map((s) => s.item).sort(), ['apple', 'food-bun']);
  assert.equal(rules.sell('bakery', 'apple').result.ok, true);
  assert.equal(state.coins, 2);
  assert.equal(state.bag.apple, 1);
  assert.equal(rules.sell('bakery', 'ruby').result.ok, false, 'the bakery does not buy gems');
  assert.equal(rules.sell('bakery', 'pear').result.ok, false, 'you cannot sell what you do not have');
  state = reload(state);
  rules = new GameRules(content, state);
  assert.equal(state.coins, 2);
  assert.equal(state.bag['food-bun'], 1);
  // Buying and selling straight back never makes coins.
  for (const s of Kitchen.shop(content, 'bakery').sells) {
    const back = Kitchen.buyingPrice(content, 'bakery', s.item);
    assert.ok(back === null || back <= s.price, `${s.item}: bought for ${s.price}, sold back for ${back}`);
  }
});

test('sparkles in the mine: crystals only appear once Miner Moss asks, three found, reload halfway, prize once', () => {
  let state = createInitialState(content);
  let rules = new GameRules(content, state);
  const Q = 'sparkles-in-mine';
  const crystal = (id) => content.entityIndex[id].entity;
  assert.equal(content.entityIndex['mine-crystal-1'].region.id, 'old-mine', 'the crystals are in the cave');
  assert.ok(MINE_CRYSTALS.every((id) => !rules.isPresent(crystal(id))), 'no crystals before the quest');
  rules.interact('east-miner', far);
  assert.equal(rules.currentStep(Q).id, 'find');
  assert.ok(MINE_CRYSTALS.every((id) => rules.isPresent(crystal(id))), 'the crystals are on the cave floor now');
  assert.match(rules.objectiveText(), /0 of 3/);
  let out = rules.interact('east-miner', far);
  assert.match(out.lines.map((l) => l.text).join(' '), /0 OF 3/, 'Miner Moss says how many are still missing');
  rules.interact('mine-crystal-1', far);
  rules.interact('mine-crystal-2', far);
  assert.match(rules.objectiveText(), /2 of 3/);
  assert.equal(rules.isPresent(crystal('mine-crystal-1')), false, 'a picked-up crystal leaves the floor');
  const [entry] = rules.journal().filter((e) => e.id === Q);
  assert.equal(entry.steps[1].have, 2);
  assert.equal(entry.steps[1].need, 3);
  state = reload(state); // close the game halfway
  rules = new GameRules(content, state);
  assert.equal(rules.isPresent(crystal('mine-crystal-2')), false, 'still picked up after a reload');
  out = rules.interact('mine-crystal-3', far);
  assert.equal(rules.currentStep(Q).id, 'back');
  assert.match(out.lines.map((l) => l.text).join(' '), /ALL THREE/);
  out = rules.interact('east-miner', far);
  assert.equal(rules.questState(Q).status, 'completed');
  assert.ok(out.notices.some((n) => n.kind === 'questDone'));
  assert.equal(state.stars, 1);
  assert.equal(state.bag.amethyst, 1);
  assert.ok(MINE_CRYSTALS.every((id) => !state.items.includes(id)), 'the crystals were handed over');
  state = reload(state);
  rules = new GameRules(content, state);
  out = rules.interact('east-miner', far);
  assert.equal(state.stars, 1, 'no second prize');
  assert.equal(state.bag.amethyst, 1);
  assert.match(out.lines.map((l) => l.text).join(' '), /SPARKLE ON MY SHELF/, 'Miner Moss says thank you afterwards');
});

test('village picnic: cook or buy the food, bring it to the blanket, reload halfway, prize once', () => {
  let state = createInitialState(content);
  let rules = new GameRules(content, state);
  const Q = 'village-picnic';
  const bunHome = content.entityIndex['baker-bun'].entity;
  const bunPicnic = content.entityIndex['picnic-bun'].entity;
  assert.equal(rules.isPresent(bunHome), true);
  assert.equal(rules.isPresent(bunPicnic), false, 'Bun is in the bakery, not at the picnic yet');
  rules.interact('baker-bun', far);
  assert.equal(rules.currentStep(Q).id, 'bring');
  assert.match(rules.objectiveText(), /0 of 3/);
  // The blanket says what is missing and takes nothing.
  let out = rules.interact('village-picnic', far);
  assert.match(out.lines.map((l) => l.text).join(' '), /0 OF 3/);
  assert.equal(out.lines[0].speaker, '', 'a blanket does not talk');
  assert.equal(rules.currentStep(Q).id, 'bring');
  // Cook a bun, buy a pie.
  state.bag = { 'veg-wheat': 2, egg: 3, honey: 1 };
  state.coins = 5;
  rules.cook('bun');
  rules.buy('bakery', 'food-pie');
  assert.match(rules.objectiveText(), /2 of 3/);
  const [entry] = rules.journal().filter((e) => e.id === Q);
  assert.deepEqual(entry.steps[1].icons.map((i) => i.got), [true, true, false], 'the journal shows which food is still missing');
  state = reload(state); // close the game halfway
  rules = new GameRules(content, state);
  rules.cook('cake');
  out = rules.interact('village-picnic', far);
  assert.equal(rules.currentStep(Q).id, 'feast');
  assert.equal(state.bag['food-bun'] || 0, 0, 'the food is on the blanket now, not in the bag');
  assert.equal(rules.isPresent(bunPicnic), true, 'Bun walks over to the picnic');
  assert.equal(rules.isPresent(bunHome), false);
  assert.equal(rules.isPresent(content.entityIndex['picnic-set-cake'].entity), true, 'the cake is on the blanket');
  out = rules.interact('picnic-bun', far);
  assert.equal(rules.questState(Q).status, 'completed');
  assert.ok(out.notices.some((n) => n.kind === 'questDone'));
  assert.equal(state.stars, 1);
  assert.equal(state.bag['food-muffin'], 2);
  delete state.bag['food-muffin']; // (with a muffin in the bag, Bun would take it as a treat)
  state = reload(state);
  rules = new GameRules(content, state);
  rules.interact('picnic-bun', far);
  rules.interact('village-picnic', far);
  assert.equal(state.stars, 1, 'no second prize');
  assert.equal(state.bag['food-muffin'] || 0, 0, 'no second prize muffins');
});

test('sharing treats: a friend takes one, a kindness heart only the first time, quest food stays safe, kept after reload', () => {
  let state = createInitialState(content);
  let rules = new GameRules(content, state);
  const cat = 'cat-hazel';
  assert.ok(content.entityIndex[cat].person, 'a sitting cat counts as a friend');
  // No treats: just the usual chat.
  let out = rules.interact(cat, far);
  assert.equal(out.shared, undefined);
  // The picnic is not started yet, but its bun, pie and cake are kept for it: only the muffin is spare.
  state.bag = { 'food-bun': 1, 'food-pie': 1, 'food-cake': 1, 'food-muffin': 2 };
  out = rules.interact(cat, far);
  assert.deepEqual(out.shared, { item: 'food-muffin', heart: true });
  assert.match(out.lines[0].text, /MUFFIN/);
  assert.equal(out.lines[0].speaker, 'Hazel');
  assert.deepEqual(out.gained, [{ item: 'food-muffin', count: -1 }, { hearts: 1 }], 'the item bar sees the muffin leave and a heart arrive');
  assert.equal(state.bag['food-muffin'], 1);
  assert.equal(state.hearts, 1);
  // Next time the cat is full and just chats; the time after, it takes another, but no second heart.
  out = rules.interact(cat, far);
  assert.equal(out.shared, undefined, 'full after a treat');
  assert.equal(state.bag['food-muffin'], 1);
  state = reload(state);
  rules = new GameRules(content, state);
  out = rules.interact(cat, far);
  assert.deepEqual(out.shared, { item: 'food-muffin', heart: false }, 'hungry again, and the heart was kept after reload');
  assert.equal(state.hearts, 1);
  assert.equal(state.bag['food-muffin'] || 0, 0);
  // Only the picnic food is left: nobody eats it.
  assert.equal(rules.interact('east-grocer', far).shared, undefined, 'quest food is never eaten');
  assert.deepEqual([state.bag['food-bun'], state.bag['food-pie'], state.bag['food-cake']], [1, 1, 1]);
  // Quest talk comes first: Baker Bun starts the picnic instead of eating anything.
  state.bag['food-tart'] = 3;
  out = rules.interact('baker-bun', far);
  assert.equal(out.shared, undefined);
  assert.equal(rules.questState('village-picnic').status, 'active');
  assert.equal(state.bag['food-tart'], 3);
  // Once the picnic is done, its kind of food is spare again. Followers (the chicks) never take treats.
  rules.interact('village-picnic', far);
  rules.interact('picnic-bun', far);
  assert.equal(rules.questState('village-picnic').status, 'completed');
  assert.equal(rules.interact(CHICKS[0], far).shared, undefined);
  out = rules.interact('east-grocer', far);
  assert.ok(out.shared, 'the grocer takes a treat');
  assert.equal(state.hearts, 2 + 2, 'two quest hearts plus two friends');
});

test('favourite treats: hints, picked first, special thanks, a gift only the first time, the journal list', () => {
  // Every friend has a favourite (or shares one, like the picnic Bun); followers have none.
  for (const [id, ref] of Object.entries(content.entityIndex)) {
    if (!ref.person || ref.entity.kind === 'follower') continue;
    assert.ok(ref.entity.favourite || ref.entity.sameFriend, `${id} has a favourite treat`);
  }
  let state = createInitialState(content);
  let rules = new GameRules(content, state);
  const cat = 'cat-luna'; // loves muffins
  const fav = content.entityIndex[cat].entity.favourite;
  assert.equal(fav.treat, 'food-muffin');
  assert.equal(rules.favourites().find((f) => f.id === cat).treat, null, 'not known yet');
  // A normal chat ends with a hint the first time, not the second; the journal now knows.
  let out = rules.interact(cat, far);
  assert.equal(out.lines.at(-1).text, fav.hint);
  assert.equal(rules.favourites().find((f) => f.id === cat).treat, 'food-muffin');
  out = rules.interact(cat, far);
  assert.ok(!out.lines.some((l) => l.text === fav.hint), 'hints only sometimes');
  // More bread than muffins, and a bun kept for the picnic: Luna still picks the muffin.
  state.bag = { 'food-bun': 1, 'food-bread': 3, 'food-muffin': 1 };
  const coins = state.coins || 0;
  out = rules.interact(cat, far);
  assert.deepEqual(out.shared, { item: 'food-muffin', heart: true, favourite: true, gift: { coins: 3 } });
  assert.equal(out.lines[0].text, fav.say);
  assert.equal(out.lines[1].text, fav.giftSay);
  assert.ok(out.gained.some((g) => g.coins === 3), 'the item bar sees the coins arrive');
  assert.equal(state.coins, coins + 3);
  assert.equal(state.bag['food-bread'], 3);
  assert.equal(state.bag['food-bun'], 1, 'picnic food stays safe');
  // Full: a normal chat, and no more hints once she has had it.
  out = rules.interact(cat, far);
  assert.equal(out.shared, undefined);
  assert.ok(!out.lines.some((l) => l.text === fav.hint));
  // After a reload: her favourite is still special, but no second gift or heart.
  state.bag['food-muffin'] = 1;
  state = reload(state);
  rules = new GameRules(content, state);
  out = rules.interact(cat, far);
  assert.deepEqual(out.shared, { item: 'food-muffin', heart: false, favourite: true });
  assert.equal(state.coins, coins + 3);
  assert.equal(out.lines.length, 1);
  const row = rules.favourites().find((f) => f.id === cat);
  assert.deepEqual([row.name, row.treat, row.had], ['Luna', 'food-muffin', true]);
  // Without their favourite, a friend takes another treat the ordinary way.
  out = rules.interact('cat-dozy', far);
  assert.deepEqual(out.shared, { item: 'food-bread', heart: true });
  // The picnic Bun is Baker Bun: one favourite, one gift, one line in the journal.
  assert.equal(rules.friendFor('picnic-bun'), 'baker-bun');
  assert.equal(rules.favouriteOf('picnic-bun'), content.entityIndex['baker-bun'].entity.favourite);
  assert.ok(!rules.favourites().some((f) => f.id === 'picnic-bun'));
  // A favourite that is not a treat is refused by the content check.
  const saved = content.entityIndex[cat].entity.favourite;
  content.entityIndex[cat].entity.favourite = { ...fav, treat: 'ruby' };
  try {
    assert.ok(checkContent(content).errors.some((e) => e.includes('favourite')), 'a gem is not a treat');
  } finally {
    content.entityIndex[cat].entity.favourite = saved;
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
