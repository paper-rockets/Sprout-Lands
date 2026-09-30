/**
 * The content check: finds mistakes in the content package before a child does.
 *
 *  1. Every name points at something real: quests at people, people at pictures,
 *     treasures at items, dialogue at dialogue files, and so on.
 *  2. "Can a kid get stuck?": walking from the start spot, the player can reach every
 *     person, animal, treasure, chest, tree to shake and quest goal, in every area, once
 *     every lock (a log on a bridge...) is open; and with the locks still shut at the start,
 *     everyone and everything a quest needs, so no quest waits behind its own lock.
 *     Walkable ground nobody can reach is reported as a warning (it may be meant as scenery).
 *  3. Rooms (inside houses): every room has a door outside and a way back out, every room can be
 *     walked into from the start, and no bit of floor in a room is cut off (nobody gets trapped).
 *
 * Returns { errors, warnings, stats }. Errors must be fixed; warnings are worth a look.
 * Used by the game in development (see loadContent.js), `npm run check:world` and `npm test`.
 * Plain JavaScript with no Phaser, so it runs in Node too.
 */

import { GameRules, STEP_TYPES, EFFECT_TYPES, createInitialState } from '../rules/GameRules.js';
import { buildWorld, floodReachable, mapSize, setBlocker } from '../world/worldModel.js';

// Interactables that sit on a solid picture (you use them from next to it) and the object they need there.
const ON_OBJECT = { tree: ['tree_', 'blossom_tree'], bush: ['berry_bush_'], hive: ['beehive'], treats: ['hw_'] };
const NEXT_TO = new Set(['chest', 'mailbox', 'fishing', 'tree', 'bush', 'hive', 'treats']);
const SIDES = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]];
// Things in "entities": clue, item, chest, blocker (quests), oven and shop (open the cooking and shop
// screens), picnic (somewhere to bring things to) and prop (only a picture that comes and goes with the story).
const THING_KINDS = ['clue', 'item', 'chest', 'blocker', 'oven', 'shop', 'picnic', 'prop'];

export function checkContent(content) {
  const errors = [];
  const warnings = [];
  const art = content.art || {};
  const items = art.items || {};
  const objects = art.objects || {};
  const creatures = art.creatures || {};
  const textures = art.textures || {};
  const mapIcons = art.ui?.mapIcons || {};
  const entities = content.entityIndex || {};
  const quests = content.quests || {};
  const err = (text) => errors.push(text);
  const pictureExists = (key) => Boolean(textures[key] || items[key] || content.characters?.[key] || Object.values(creatures).some((c) => (c.textures || []).includes(key)));

  // Routes some quest, dialogue or chest opens with an "unlock" effect.
  const opened = new Set();
  const collectUnlocks = (effects) => (effects || []).forEach((e) => e.type === 'unlock' && opened.add(e.route));
  for (const q of Object.values(quests)) {
    q.steps?.forEach((st) => collectUnlocks(st.effects));
    collectUnlocks(q.complete?.effects);
  }
  for (const options of Object.values(content.dialogue || {})) if (Array.isArray(options)) options.forEach((o) => collectUnlocks(o.effects));
  for (const { entity } of Object.values(entities)) collectUnlocks(entity.effects);

  /* ---------- world.json ---------- */
  const [worldW, worldH] = content.world?.size || [0, 0];
  const placed = new Set();
  for (const p of content.world?.regions || []) {
    const region = content.regions?.[p.id];
    if (!region) {
      err(`world.json places a region "${p.id}" that has no file in world/regions`);
      continue;
    }
    placed.add(p.id);
    const { width, height } = mapSize(region.map || []);
    if (p.at[0] < 0 || p.at[1] < 0 || p.at[0] + width > worldW || p.at[1] + height > worldH) {
      err(`region "${p.id}" (${width} x ${height} at ${p.at}) does not fit inside the world size ${worldW} x ${worldH}`);
    }
    (region.map || []).forEach((row, y) => {
      if (row.length !== width) err(`region "${p.id}": map row ${y} is ${row.length} wide, the others are ${width}`);
    });
  }
  for (const id of Object.keys(content.regions || {})) if (!placed.has(id)) warnings.push(`region "${id}" has a file but world.json does not place it`);
  checkRooms(content, err, (text) => warnings.push(text));
  const start = content.world?.start;
  if (!start || !content.regions?.[start.region]) err(`world.json "start" must name a placed region (got ${JSON.stringify(start?.region)})`);

  /* ---------- people, animals and things in each region ---------- */
  const ids = new Map(); // one-time ids: pickups and chests must be unique across the whole game
  const claim = (id, where) => {
    if (!id) return;
    if (ids.has(id)) err(`the id "${id}" is used twice (${ids.get(id)} and ${where})`);
    else ids.set(id, where);
  };
  for (const [id, { entity }] of Object.entries(entities)) claim(id, 'a person or thing');

  for (const region of [...Object.values(content.regions || {}), ...Object.values(content.rooms || {})]) {
    const where = `${content.rooms?.[region.id] === region ? 'room' : 'region'} "${region.id}"`;
    const at = (thing) => (Array.isArray(thing.at) ? thing.at.join(',') : '?');
    const tiles = new Map();
    for (const obj of region.objects || []) {
      if (!objects[obj.type]) err(`${where}: object "${obj.type}" at ${at(obj)} is not in art.json objects`);
      const key = at(obj);
      if (!tiles.has(key)) tiles.set(key, []);
      tiles.get(key).push(obj.type);
    }
    const critterIds = new Set();
    for (const npc of region.npcs || []) {
      if (npc.character && !content.characters?.[npc.character]) err(`${where}: "${npc.id}" uses character "${npc.character}", which is not in characters.json`);
      if (npc.sprite && !pictureExists(npc.sprite)) err(`${where}: "${npc.id}" uses picture "${npc.sprite}", which art.json does not have`);
      if (npc.critter && !creatures[npc.critter.kind]) err(`${where}: "${npc.id}" is a "${npc.critter.kind}", which is not in art.json creatures`);
      if (npc.critter) critterIds.add(npc.id);
      if (npc.dialogue && !content.dialogue?.[npc.dialogue]) err(`${where}: "${npc.id}" uses dialogue "${npc.dialogue}", which no dialogue file has`);
      if (npc.homeWith && !entities[npc.homeWith]) err(`${where}: "${npc.id}" goes home with "${npc.homeWith}", who does not exist`);
      if (npc.emote && mapIcons[npc.emote] === undefined) err(`${where}: "${npc.id}" has emote "${npc.emote}", which is not in art.json ui.mapIcons`);
      if (!npc.say && !npc.dialogue && !npc.kind) warnings.push(`${where}: "${npc.id}" has nothing to say`);
      if (npc.alt?.character && !content.characters?.[npc.alt.character]) err(`${where}: "${npc.id}" has an alt look "${npc.alt.character}", which is not in characters.json`);
      if (npc.character && content.characters?.[npc.character]?.player && !npc.alt) {
        warnings.push(`${where}: "${npc.id}" looks like "${npc.character}", which players can pick as their own friend; give them an "alt" look for that case`);
      }
    }
    for (const thing of region.entities || []) {
      if (!objects[thing.object]) err(`${where}: "${thing.id}" uses picture "${thing.object}", which is not in art.json objects`);
      if (!THING_KINDS.includes(thing.kind)) err(`${where}: "${thing.id}" is a "${thing.kind}"; things in "entities" are a ${THING_KINDS.join(', ')}`);
      if (thing.kind === 'shop' && !content.cooking?.shops?.[thing.shop]) err(`${where}: shop "${thing.id}" sells from "${thing.shop}", which cooking.json "shops" does not have`);
      if (thing.kind === 'oven' && !(content.cooking?.recipes || []).length) err(`${where}: oven "${thing.id}" has nothing to cook: cooking.json has no "recipes"`);
      if (thing.kind === 'blocker') {
        if (!thing.hiddenWhen && !thing.visibleWhen) warnings.push(`${where}: blocker "${thing.id}" has no "hiddenWhen", so it never moves`);
        const route = thing.hiddenWhen?.route;
        if (route && !opened.has(route)) err(`${where}: blocker "${thing.id}" waits for route "${route}", but no quest or dialogue ever unlocks it`);
      }
    }
    for (const c of region.critters || []) {
      if (!creatures[c.kind]) err(`${where}: an animal at ${at(c)} is a "${c.kind}", which is not in art.json creatures`);
      if (c.follow && !critterIds.has(c.follow)) err(`${where}: a ${c.kind} at ${at(c)} follows "${c.follow}", which is not an animal listed before it`);
      if (c.id) critterIds.add(c.id);
    }
    for (const pk of region.pickups || []) {
      claim(pk.id, `${where} pickup`);
      if (!items[pk.item]) err(`${where}: pickup "${pk.id}" gives "${pk.item}", which is not in art.json items`);
    }
    for (const it of region.interactables || []) {
      if (it.kind === 'chest') {
        claim(it.id, `${where} chest`);
        if (art.chests && !art.chests[it.color]) err(`${where}: chest "${it.id}" has colour "${it.color}", which art.json chests does not have`);
      }
      if (it.item && !items[it.item]) err(`${where}: ${it.kind} at ${at(it)} gives "${it.item}", which is not in art.json items`);
      for (const candy of it.items || []) if (!items[candy]) err(`${where}: ${it.kind} at ${at(it)} can give "${candy}", which is not in art.json items`);
      if (it.kind === 'treats' && (!it.items?.length || !it.reply)) err(`${where}: the treats door at ${at(it)} needs "items" (candy) and a "reply"`);
      const prize = it.reward?.item;
      if (prize && !items[prize]) err(`${where}: ${it.kind} at ${at(it)} gives "${prize}", which is not in art.json items`);
      for (const letter of it.letters || []) {
        if (letter.reward?.item && !items[letter.reward.item]) err(`${where}: a letter gives "${letter.reward.item}", which is not in art.json items`);
      }
      const need = ON_OBJECT[it.kind];
      if (need && !(tiles.get(at(it)) || []).some((t) => need.some((prefix) => t.startsWith(prefix)))) {
        err(`${where}: the ${it.kind} at ${at(it)} has no matching picture on that tile`);
      }
    }
    // Treasures and clues must not hide behind a tree or house picture standing in front of them.
    const front = (region.objects || []).map((obj) => {
      const def = objects[obj.type];
      if (!def?.rect || def.flat) return null;
      const [offX, offY] = def.offset || [0, 0];
      const cx = obj.at[0] * 16 + 8 + offX;
      const bottom = (obj.at[1] + 1) * 16 + offY;
      return { type: obj.type, left: cx - def.rect[2] / 2, right: cx + def.rect[2] / 2, top: bottom - def.rect[3], bottom };
    }).filter(Boolean);
    const hiddenBehind = (at) => {
      const px = at[0] * 16 + 8;
      const py = at[1] * 16 + 8;
      return front.find((f) => f.bottom > (at[1] + 1) * 16 && px > f.left + 2 && px < f.right - 2 && py > f.top + 2 && py < f.bottom);
    };
    const findable = [
      ...(region.pickups || []).map((pk) => [pk.id, pk.at]),
      ...(region.interactables || []).filter((it) => it.kind === 'chest' || it.kind === 'mailbox').map((it) => [it.id || it.kind, it.at]),
      ...(region.entities || []).map((e) => [e.id, e.at])
    ];
    for (const [id, at] of findable) {
      const cover = hiddenBehind(at);
      if (cover) warnings.push(`${where}: "${id}" at ${at} is hidden behind the ${cover.type} in front of it`);
    }
    for (const lm of region.landmarks || []) {
      if (lm.icon && mapIcons[lm.icon] === undefined) err(`${where}: landmark "${lm.name}" uses icon "${lm.icon}", which is not in art.json ui.mapIcons`);
    }
  }

  /* ---------- cooking and shops (cooking.json) ---------- */
  checkCooking(content, err);

  /* ---------- quests ---------- */
  const tagged = (tag) => Object.values(entities).filter(({ entity }) => (entity.tags || []).includes(tag)).length;
  const checkCondition = (cond, where) => {
    if (!cond || typeof cond !== 'object') return;
    if (Array.isArray(cond)) return cond.forEach((c) => checkCondition(c, where));
    for (const key of ['all', 'any']) if (cond[key]) cond[key].forEach((c) => checkCondition(c, where));
    if (cond.not) checkCondition(cond.not, where);
    for (const key of ['questActive', 'questCompleted', 'questNotStarted']) {
      if (cond[key] && !quests[cond[key]]) err(`${where}: a condition names quest "${cond[key]}", which does not exist`);
    }
    for (const q of cond.questsCompleted || []) if (!quests[q]) err(`${where}: a condition names quest "${q}", which does not exist`);
    if (cond.questStep) {
      const q = quests[cond.questStep.quest];
      if (!q) err(`${where}: a condition names quest "${cond.questStep.quest}", which does not exist`);
      else if (!q.steps.some((s) => s.id === cond.questStep.step)) err(`${where}: quest "${q.id}" has no step "${cond.questStep.step}"`);
    }
    if (cond.entityStatus && !entities[cond.entityStatus.id]) err(`${where}: a condition names "${cond.entityStatus.id}", who does not exist`);
    for (const c of cond.hasClues || []) if (!entities[c]) err(`${where}: a condition names clue "${c}", which does not exist`);
    if (cond.route && !content.world?.routes?.[cond.route]) err(`${where}: a condition names route "${cond.route}", which world.json does not have`);
  };
  const checkEffects = (effects, where) => {
    for (const e of effects || []) {
      if (!EFFECT_TYPES.includes(e.type)) err(`${where}: unknown effect "${e.type}" (known: ${EFFECT_TYPES.join(', ')})`);
      if (e.type === 'startQuest' && !quests[e.quest]) err(`${where}: starts quest "${e.quest}", which does not exist`);
      if (e.type === 'reward' && !content.rewards?.[e.id]) err(`${where}: gives reward "${e.id}", which rewards.json does not have`);
      if (e.type === 'unlock' && !content.world?.routes?.[e.route]) err(`${where}: unlocks route "${e.route}", which world.json does not have`);
      if (e.type === 'openChest' && !entities[e.id]) err(`${where}: opens "${e.id}", which does not exist`);
      if ((e.type === 'sendHome' || e.type === 'dismissFollowers') && !tagged(e.tag)) err(`${where}: sends home followers tagged "${e.tag}", but nobody has that tag`);
      if (e.speaker && !entities[e.speaker]) err(`${where}: "${e.speaker}" speaks, but does not exist`);
    }
  };
  for (const quest of Object.values(quests)) {
    const where = `quest "${quest.id}"`;
    if (!quest.title) err(`${where} needs a "title"`);
    if (quest.giver && !entities[quest.giver]) err(`${where}: giver "${quest.giver}" does not exist`);
    if (!quest.giver) warnings.push(`${where} has no giver, so only an effect can start it`);
    if (!Array.isArray(quest.steps) || !quest.steps.length) {
      err(`${where} needs at least one step`);
      continue;
    }
    if (quest.icon && !pictureExists(quest.icon)) err(`${where}: icon "${quest.icon}" is not a picture art.json has`);
    for (const [item] of Object.entries(quest.reward?.items || {})) if (!items[item]) err(`${where}: the prize "${item}" is not in art.json items`);
    checkCondition(quest.requires, where);
    const stepIds = new Set();
    quest.steps.forEach((step, i) => {
      const sw = `${where} step ${i + 1} ("${step.id}")`;
      if (!step.id) err(`${where} step ${i + 1} needs an "id"`);
      if (stepIds.has(step.id)) err(`${sw}: two steps share this id`);
      stepIds.add(step.id);
      if (!STEP_TYPES.includes(step.type)) err(`${sw}: unknown type "${step.type}" (known: ${STEP_TYPES.join(', ')})`);
      if (!step.objective) warnings.push(`${sw} has no "objective", so the goal note shows the quest title`);
      if ((step.type === 'talk' || step.type === 'deliver') && !entities[step.target]) err(`${sw}: talks to "${step.target}", who does not exist`);
      if (step.type === 'deliver') for (const i2 of step.items || [step.item]) if (!entities[i2]) err(`${sw}: delivers "${i2}", which does not exist`);
      if (step.type === 'gatherFollowers' || step.type === 'escort') {
        const have = tagged(step.tag);
        if (have < (step.count || 1)) err(`${sw}: needs ${step.count || 1} followers tagged "${step.tag}", but only ${have} exist`);
      }
      if (step.type === 'escort' && step.to && !entities[step.to]) err(`${sw}: goes to "${step.to}", who does not exist`);
      if ((step.type === 'reach' || step.area) && step.area && !content.regions?.[step.area] && !content.rooms?.[step.area]) err(`${sw}: area "${step.area}" does not exist`);
      for (const c of step.clues || []) if (!entities[c]) err(`${sw}: clue "${c}" does not exist`);
      for (const i2 of step.items || (step.type === 'collect' ? [step.item] : [])) if (!entities[i2]) err(`${sw}: item "${i2}" does not exist`);
      for (const who of Object.keys(step.hints || {})) if (!entities[who]) err(`${sw}: has a hint for "${who}", who does not exist`);
      if (step.type === 'bring') {
        if (!entities[step.target]) err(`${sw}: brings things to "${step.target}", which does not exist`);
        if (!Object.keys(step.bag || {}).length) err(`${sw}: a "bring" step needs a "bag" ({ "item": how many })`);
        for (const [item, n] of Object.entries(step.bag || {})) {
          if (!items[item]) err(`${sw}: brings "${item}", which is not in art.json items`);
          if (!(n >= 1)) err(`${sw}: brings ${n} of "${item}"; it must be 1 or more`);
        }
      }
      if (step.speaker && !entities[step.speaker]) err(`${sw}: "${step.speaker}" speaks, but does not exist`);
      if (step.icon && !pictureExists(step.icon)) err(`${sw}: icon "${step.icon}" is not a picture art.json has`);
      checkEffects(step.effects, sw);
    });
    checkEffects(quest.complete?.effects, `${where} (end)`);
    if (quest.complete?.speaker && !entities[quest.complete.speaker]) err(`${where}: "${quest.complete.speaker}" speaks at the end, but does not exist`);
  }
  for (const [id, options] of Object.entries(content.dialogue || {})) {
    if (!Array.isArray(options)) continue; // "about" notes
    options.forEach((opt, i) => {
      checkCondition(opt.when, `dialogue "${id}" option ${i + 1}`);
      checkEffects(opt.effects, `dialogue "${id}" option ${i + 1}`);
    });
  }
  for (const [id, { entity }] of Object.entries(entities)) {
    checkCondition(entity.joinsWhen, `"${id}"`);
    checkCondition(entity.opensWhen, `"${id}"`);
    checkCondition(entity.visibleWhen, `"${id}"`);
    checkCondition(entity.hiddenWhen, `"${id}"`);
    checkEffects(entity.effects, `"${id}"`);
  }

  /* ---------- can a kid get stuck? ---------- */
  const stats = {};
  if (start && content.regions?.[start.region]) {
    let world;
    let startWorld;
    try {
      // Everything once all locks are open, and the world as it is at the very start.
      world = buildWorld(content);
      startWorld = buildWorld(content);
      const fresh = new GameRules(content, createInitialState(content));
      for (const region of world.regions) {
        for (const e of region.entities || []) {
          if (e.kind !== 'blocker') continue;
          setBlocker(world, region, e, objects, false);
          setBlocker(startWorld, startWorld.regions.find((r) => r.id === region.id), e, objects, fresh.isPresent(e));
        }
      }
    } catch (e) {
      err(`the world could not be built: ${e.message}`);
    }
    if (world) {
      const home = world.regions.find((r) => r.id === start.region);
      const sx = home.ox + start.at[0];
      const sy = home.oy + start.at[1];
      if (world.isBlocked(sx, sy)) err(`the start spot ${start.at} in "${start.region}" is not somewhere the player can stand`);
      const reached = reachThroughDoors(world, sx, sy);
      const ok = (x, y) => world.inBounds(x, y) && reached[world.idx(x, y)] === 1;
      const nearOk = (x, y) => SIDES.some(([dx, dy]) => ok(x + dx, y + dy));
      let reachable = 0;
      for (let i = 0; i < reached.length; i += 1) reachable += reached[i];
      stats.reachableTiles = reachable;

      for (const region of world.regions) {
        const where = `${region.kind} "${region.id}"`;
        if (region.kind === 'room' && region.door && region.exit && !ok(region.ox + region.exit[0], region.oy + region.exit[1] - 1)) {
          err(`${where} can never be walked into: its door at ${region.door.region} ${region.door.at} cannot be reached from the start`);
        }
        const W = (at) => [region.ox + Math.floor(at[0]), region.oy + Math.floor(at[1])];
        for (const npc of region.npcs || []) {
          const [x, y] = W(npc.at);
          if (!nearOk(x, y)) err(`${where}: "${npc.id}" at ${npc.at} cannot be reached from the start`);
        }
        for (const thing of region.entities || []) {
          const [x, y] = W(thing.at);
          if (!nearOk(x, y)) err(`${where}: "${thing.id}" at ${thing.at} cannot be reached from the start`);
        }
        for (const c of region.critters || []) {
          const [x, y] = W(c.at);
          if (world.isBlocked(x, y)) err(`${where}: a ${c.kind} at ${c.at} starts somewhere it cannot stand`);
        }
        for (const pk of region.pickups || []) {
          const [x, y] = W(pk.at);
          if (!ok(x, y)) err(`${where}: pickup "${pk.id}" at ${pk.at} cannot be reached from the start`);
        }
        for (const it of region.interactables || []) {
          const [x, y] = W(it.at);
          const fine = NEXT_TO.has(it.kind) ? nearOk(x, y) : ok(x, y);
          if (!fine) err(`${where}: the ${it.kind}${it.id ? ` "${it.id}"` : ''} at ${it.at} cannot be reached from the start`);
          if (it.kind === 'fishing' && it.cast) {
            const [cx, cy] = W(it.cast);
            if (world.get(cx, cy) !== 0) err(`${where}: the fishing spot at ${it.at} casts onto ${it.cast}, which is not open water`);
          }
        }
        for (const lm of region.landmarks || []) {
          const [x, y] = W(lm.at);
          let near = false;
          for (let dy = -3; dy <= 3 && !near; dy += 1) for (let dx = -3; dx <= 3 && !near; dx += 1) near = ok(x + dx, y + dy);
          if (!near) warnings.push(`${where}: landmark "${lm.name}" at ${lm.at} is not near anywhere the player can walk`);
        }
      }

      // With the locks still shut: every quest's people, clues and things can be reached.
      const home2 = startWorld.regions.find((r) => r.id === start.region);
      const reachedAtStart = reachThroughDoors(startWorld, home2.ox + start.at[0], home2.oy + start.at[1]);
      const okAtStart = (x, y) => startWorld.inBounds(x, y) && reachedAtStart[startWorld.idx(x, y)] === 1;
      const needed = new Set();
      for (const q of Object.values(quests)) {
        if (q.giver) needed.add(q.giver);
        for (const st of q.steps || []) {
          for (const id of [st.target, st.to, ...(st.clues || []), ...(st.items || [])]) if (id) needed.add(id);
          if (st.tag) for (const [id, r] of Object.entries(entities)) if ((r.entity.tags || []).includes(st.tag)) needed.add(id);
        }
      }
      for (const id of needed) {
        const ref = entities[id];
        if (!ref?.entity.at || ref.region.ox === undefined) continue;
        const x = ref.region.ox + Math.floor(ref.entity.at[0]);
        const y = ref.region.oy + Math.floor(ref.entity.at[1]);
        if (!SIDES.some(([dx, dy]) => okAtStart(x + dx, y + dy))) err(`"${id}" is needed by a quest but is behind a lock at the start, so that quest could never be finished`);
      }

      // Paths plugged by a picture: a narrow way the ground would let you walk through, but a tree,
      // flower or rock stands in it, so it turns into a dead end (it looks walkable, but is not).
      const bare = buildWorld(content, { objectDefs: {} });
      const walk = (w, x, y) => w.inBounds(x, y) && !w.blocked[w.idx(x, y)];
      for (let y = 1; y < world.height - 1; y += 1) {
        for (let x = 1; x < world.width - 1; x += 1) {
          if (!world.blocked[world.idx(x, y)] || bare.blocked[world.idx(x, y)]) continue; // only cells a picture blocks
          const lr = walk(bare, x - 1, y) && walk(bare, x + 1, y) && !walk(bare, x, y - 1) && !walk(bare, x, y + 1);
          const ud = walk(bare, x, y - 1) && walk(bare, x, y + 1) && !walk(bare, x - 1, y) && !walk(bare, x + 1, y);
          if (!lr && !ud) continue; // not inside a one-tile-wide path
          const ends = lr ? [[x - 1, y], [x + 1, y]] : [[x, y - 1], [x, y + 1]];
          if (!ends.some(([ex, ey]) => ok(ex, ey))) continue; // nobody can get there anyway
          const region = world.regionAt(x, y);
          warnings.push(`region "${region?.id}": something standing at ${x - (region?.ox || 0)},${y - (region?.oy || 0)} blocks a one-tile-wide path and makes a dead end`);
        }
      }

      // Walkable ground nobody can get to (fine for scenery, but often a missing bridge).
      const seen = new Uint8Array(reached.length);
      const pockets = [];
      for (let y = 0; y < world.height; y += 1) {
        for (let x = 0; x < world.width; x += 1) {
          const i = world.idx(x, y);
          if (reached[i] || seen[i] || world.blocked[i]) continue;
          const pocket = floodReachable(world, x, y);
          let size = 0;
          for (let j = 0; j < pocket.length; j += 1) if (pocket[j]) { seen[j] = 1; size += 1; }
          const region = world.regionAt(x, y);
          if (region?.kind === 'room') {
            err(`room "${region.id}": ${size} floor tile(s) around ${x - region.ox},${y - region.oy} cannot be reached from its door (somebody could get trapped)`);
            continue;
          }
          pockets.push({ x, y, size, region: region?.id || 'none' });
        }
      }
      stats.unreachablePockets = pockets.length;
      for (const p of pockets.filter((q) => q.size >= 4)) {
        const r = world.regions.find((g) => g.id === p.region);
        const local = r ? [p.x - r.ox, p.y - r.oy] : [p.x, p.y];
        warnings.push(`region "${p.region}": ${p.size} walkable tiles around ${local} cannot be reached from the start (a missing bridge or gap?)`);
      }
    }
  }
  return { errors, warnings, stats };
}

/**
 * Rooms inside houses (world.json "rooms", world/rooms/*.json): placed inside the world but below the
 * islands, not on top of each other, with a known style, a door outside that leads in and an exit gap
 * that leads back out, and any floor kept free for later (Baker Bun's counter) still free.
 */
function checkRooms(content, err, warn) {
  const world = content.world || {};
  const [worldW, worldH] = world.size || [0, 0];
  const outdoor = world.outdoorBounds || [0, 0, worldW, worldH];
  const styles = content.art?.rooms?.styles || {};
  const objects = content.art?.objects || {};
  const placed = [];
  const doors = new Map();
  const overlaps = (a, b) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];
  for (const p of world.rooms || []) {
    const room = content.rooms?.[p.id];
    const where = `room "${p.id}"`;
    if (!room) {
      err(`world.json places a room "${p.id}" that has no file in world/rooms`);
      continue;
    }
    const { width, height } = mapSize(room.map || []);
    const box = [p.at[0], p.at[1], width, height];
    if (box[0] < 0 || box[1] < 0 || box[0] + width > worldW || box[1] + height > worldH) err(`${where} (${width} x ${height} at ${p.at}) does not fit inside the world size ${worldW} x ${worldH}`);
    if (overlaps(box, outdoor)) err(`${where} at ${p.at} sits on top of the islands; rooms go below "outdoorBounds"`);
    for (const other of placed) if (overlaps(box, other.box)) err(`${where} overlaps room "${other.id}"`);
    placed.push({ id: p.id, box });
    if (!styles[room.style]) err(`${where} uses style "${room.style}", which art.json rooms.styles does not have`);
    // The way back out: a floor gap in the bottom wall, with floor just inside it.
    const cell = (x, y) => room.map?.[y]?.[x];
    if (!room.exit) {
      err(`${where} has no "exit" (the gap in its bottom wall that leads back outside)`);
    } else {
      const [ex, ey] = room.exit;
      if (ey !== height - 1 || cell(ex, ey) !== '_' || cell(ex, ey - 1) !== '_') err(`${where}: its exit ${room.exit} must be a floor gap in the bottom wall, with floor just inside`);
    }
    // The way in: a door in a placed region, not shared with another room.
    const door = room.door;
    if (!door?.region || !Array.isArray(door.at)) {
      err(`${where} has no "door" ({ "region": ..., "at": [x, y] }), so nobody can get in`);
      continue;
    }
    const region = content.regions?.[door.region];
    if (!region || !(world.regions || []).some((r) => r.id === door.region)) {
      err(`${where}: its door is in region "${door.region}", which world.json does not place`);
      continue;
    }
    const key = `${door.region}:${door.at.join(',')}`;
    if (doors.has(key)) err(`${where} and room "${doors.get(key)}" share the door at ${door.region} ${door.at}`);
    doors.set(key, p.id);
    const isHouseDoor = (region.objects || []).some((o) => {
      const d = objects[o.type]?.door;
      return d && o.at[0] + d[0] === door.at[0] && o.at[1] + d[1] === door.at[1];
    });
    if (!isHouseDoor) warn(`${where}: its door at ${door.region} ${door.at} is not a house doorway (fine for a cave mouth)`);
    // Floor kept free for a later job.
    for (const r of room.reserved || []) {
      for (const obj of room.objects || []) {
        for (const [dx, dy] of objects[obj.type]?.foot || []) {
          const x = obj.at[0] + dx;
          const y = obj.at[1] + dy;
          if (x >= r.at[0] && y >= r.at[1] && x < r.at[0] + r.size[0] && y < r.at[1] + r.size[1]) err(`${where}: ${obj.type} at ${obj.at} stands on the floor kept free for ${r.for}`);
        }
      }
    }
  }
  for (const id of Object.keys(content.rooms || {})) if (!placed.some((p) => p.id === id)) warn(`room "${id}" has a file but world.json does not place it`);
}

/**
 * Everywhere the player can walk from (sx, sy), going through house doors into rooms and back out.
 * A room counts as reached when its door (or the ground just below it) is reached.
 */
export function reachThroughDoors(world, sx, sy) {
  const reached = floodReachable(world, sx, sy);
  const rooms = world.regions.filter((r) => r.kind === 'room' && r.door && r.exit);
  const at = (x, y) => world.inBounds(x, y) && reached[world.idx(x, y)] === 1;
  let grew = true;
  while (grew) {
    grew = false;
    for (const room of rooms) {
      const outside = world.regions.find((r) => r.kind === 'region' && r.id === room.door.region);
      if (!outside) continue;
      const dx = outside.ox + room.door.at[0];
      const dy = outside.oy + room.door.at[1];
      const inX = room.ox + room.exit[0];
      const inY = room.oy + room.exit[1] - 1;
      const doorReached = at(dx, dy) || at(dx, dy + 1);
      // In through the door; or, for a room you start in, out through its exit.
      let from = null;
      if (doorReached && !at(inX, inY)) from = [inX, inY];
      else if (!doorReached && at(inX, inY)) from = [dx, dy + 1];
      if (!from || world.isBlocked(from[0], from[1])) continue;
      const more = floodReachable(world, from[0], from[1]);
      for (let i = 0; i < more.length; i += 1) {
        if (more[i] && !reached[i]) {
          reached[i] = 1;
          grew = true;
        }
      }
    }
  }
  return reached;
}

/** Recipes make real items from real items or bag groups; shops sell and buy real things for whole coins. */
function checkCooking(content, err) {
  const items = content.art?.items || {};
  const groups = new Set(Object.values(items).map((i) => i?.group).filter(Boolean));
  const cooking = content.cooking || {};
  const ids = new Set();
  for (const [i, r] of (cooking.recipes || []).entries()) {
    const where = `cooking.json recipe ${i + 1} ("${r.id}")`;
    if (!r.id) err(`cooking.json recipe ${i + 1} needs an "id"`);
    if (ids.has(r.id)) err(`${where}: two recipes share this id`);
    ids.add(r.id);
    if (!items[r.makes]) err(`${where}: makes "${r.makes}", which is not in art.json items`);
    if (!(r.needs || []).length) err(`${where}: needs nothing; list what it is made from in "needs"`);
    for (const need of r.needs || []) {
      if (need.item && !items[need.item]) err(`${where}: needs "${need.item}", which is not in art.json items`);
      if (need.group && !groups.has(need.group)) err(`${where}: needs something from the group "${need.group}", which no art.json item has`);
      if (!need.item && !need.group) err(`${where}: each need names an "item" or a "group"`);
      if (need.count !== undefined && !(Number.isInteger(need.count) && need.count >= 1)) err(`${where}: count ${need.count} must be a whole number, 1 or more`);
    }
  }
  if (cooking.share) {
    if (!groups.has(cooking.share.group)) err(`cooking.json share: the group "${cooking.share.group}" is not an art.json item group`);
    if (![].concat(cooking.share.say || []).length) err('cooking.json share: needs at least one "say" line (what a friend says when taking a treat)');
  }
  // Favourite treats live in each friend's own entry: { treat, say, hint, gift: { coins, items } }.
  for (const [id, { entity }] of Object.entries(content.entityIndex || {})) {
    if (entity.sameFriend && !content.entityIndex[entity.sameFriend]?.entity?.favourite) err(`"${id}": sameFriend "${entity.sameFriend}" does not exist or has no favourite treat`);
    const fav = entity.favourite;
    if (!fav) continue;
    const where = `"${id}" favourite treat`;
    if (!cooking.share) err(`${where}: cooking.json has no "share", so nobody takes treats`);
    if (items[fav.treat]?.group !== cooking.share?.group) err(`${where}: "${fav.treat}" is not an art.json item in the "${cooking.share?.group}" group`);
    if (![].concat(fav.say || []).length) err(`${where}: needs a "say" line (their special thank-you)`);
    if (![].concat(fav.hint || []).length) err(`${where}: needs a "hint" line (so players can find out)`);
    for (const [item, n] of Object.entries(fav.gift?.items || {})) {
      if (!items[item]) err(`${where}: the gift "${item}" is not in art.json items`);
      if (!(Number.isInteger(n) && n >= 1)) err(`${where}: gift count ${n} must be a whole number, 1 or more`);
    }
  }
  const price = (p) => Number.isInteger(p) && p >= 1;
  for (const [id, shop] of Object.entries(cooking.shops || {})) {
    const where = `cooking.json shop "${id}"`;
    if (shop.keeper && !content.entityIndex?.[shop.keeper]) err(`${where}: keeper "${shop.keeper}" does not exist`);
    for (const s of shop.sells || []) {
      if (!items[s.item]) err(`${where}: sells "${s.item}", which is not in art.json items`);
      if (!price(s.price)) err(`${where}: "${s.item}" costs ${s.price}; prices are whole coins, 1 or more`);
    }
    for (const b of shop.buys || []) {
      if (b.item && !items[b.item]) err(`${where}: buys "${b.item}", which is not in art.json items`);
      if (b.group && !groups.has(b.group)) err(`${where}: buys the group "${b.group}", which no art.json item has`);
      if (!price(b.price)) err(`${where}: pays ${b.price} for "${b.item || b.group}"; prices are whole coins, 1 or more`);
      // Buying something and selling it straight back must never make coins out of nothing.
      for (const s of shop.sells || []) {
        const same = s.item === b.item || (b.group && items[s.item]?.group === b.group);
        if (same && b.price > s.price) err(`${where}: pays ${b.price} for "${s.item}" but sells it for ${s.price}, so coins could be made from nothing`);
      }
    }
  }
}
