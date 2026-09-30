/**
 * Things to find and gather, all listed in region files:
 *
 *   "pickups":       one-time treasures lying about, e.g. { "id": "egg-1", "item": "egg", "at": [12, 14] }.
 *                    Walk over one and it is yours; it never comes back.
 *   "interactables": things you use with the Talk button or E:
 *                      tree / bush - shake it and fruit or berries fall to the ground
 *                      hive        - gather honey
 *                      chest       - open it for coins and maybe a gem
 *                      fishing     - cast a line from the spot into the water tile "cast" (see Fishing.js)
 *                      mailbox     - read the letters waiting in it ("letters": [{ from, text, reward }])
 *                      treats      - knock on a house door ("who", "reply", "items": candy to pick from, "cooldown"): trick or treat
 *
 * What the player has gathered is saved in the session (bag, coins, collected).
 */

import { TILE } from '../world/worldModel.js';
import { Fishing } from './Fishing.js';

const COLLECT_RADIUS = 12; // how close the player must get to scoop up an item lying on the ground
const USE_RANGE = 24; // how close to use a tree, bush, hive or chest
const DROP_LIFETIME = 90000; // fallen fruit disappears after a minute and a half

/** Where a plant starts the first time: four in ten are ready to pick, two in ten are bare soil, the rest still need a drink. */
function startStage(id) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 1009;
  const r = h % 10;
  if (r < 4) return RIPE;
  if (r < 6) return EMPTY; // bare soil waiting for a seed
  return 1 + ((r - 6) % 3);
}

const between = (a, b) => a + Math.random() * (b - a);
const randomInt = ([a, b]) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (list) => list[Math.floor(Math.random() * list.length)];

const ICONS = { tree: 'sprout', bush: 'sprout', hive: 'heart', chest: 'star', mailbox: 'talk', fishing: 'star', crop: 'sprout', treats: 'talk' };
const WET_MS = 12000; // a watered plant stays dark and happy this long (and can't be watered again before)
const EMPTY = -1; // no plant: bare soil
const RIPE = 4; // plant pictures: 0 seed in the soil, 1 sprout, 2 small, 3 big, 4 ready to pick
const WET_TINT = 0xa9b9d9;
const HELPER_TARGET = 10; // waterings of different plants that earn a kindness heart

export class Pickups {
  constructor(scene) {
    this.scene = scene;
    this.session = scene.session;
    this.art = scene.content.art;
    this.effects = scene.effects;
    this.floating = []; // items lying on the ground
    this.spots = []; // trees, bushes, hives, chests
    this.readyAt = new Map(); // spot id -> the time (ms) it can be used again
    this.fishing = new Fishing(scene);

    for (const [color, chest] of Object.entries(this.art.chests || {})) {
      if (color === 'about' || scene.anims.exists(`chest-open-${color}`)) continue;
      scene.anims.create({ key: `chest-open-${color}`, frames: scene.anims.generateFrameNumbers(chest.tex, { frames: chest.frames }), frameRate: 10, repeat: 0 });
    }
  }

  sound(id, opts) {
    this.scene.registry.get('audio')?.play(id, opts);
  }

  addRegion(region) {
    for (const def of region.pickups || []) this.addPickup(region, def);
    for (const def of region.interactables || []) this.addSpot(region, def);
    // Every crop in the fields can be watered; nothing needs to be listed in the region file.
    for (const obj of region.objects || []) {
      if (!/^crop_/.test(obj.type)) continue;
      const sprite = this.scene.objectSprites.get(`${region.id}:${obj.at[0]},${obj.at[1]}`);
      if (!sprite) continue;
      const { x, y } = this.pixels(region, obj.at);
      const spot = { id: `${region.id}:crop:${obj.at.join(',')}`, kind: 'crop', def: obj, x, y, icon: ICONS.crop, sprite };
      spot.rect = this.art.objects[obj.type].rect;
      this.setStage(spot, this.session.state.crops?.[spot.id] ?? startStage(spot.id));
      this.spots.push(spot);
    }
  }

  pixels(region, at) {
    return { x: (region.ox + at[0]) * TILE + TILE / 2, y: (region.oy + at[1] + 1) * TILE };
  }

  /* ---------------- things lying on the ground ---------------- */

  addPickup(region, def) {
    if (!def.id) throw new Error(`${region.id}: every pickup needs an "id"`);
    if (!this.art.items[def.item]) throw new Error(`${region.id}: pickup "${def.id}" uses unknown item "${def.item}"`);
    if (this.session.hasCollected(def.id)) return;
    const { x, y } = this.pixels(region, def.at);
    this.spawnFloating(x, y - 5, def.item, def.id, null, true);
  }

  spawnFloating(x, y, itemId, oneTimeId, lifetime, ready) {
    const scene = this.scene;
    const item = this.art.items[itemId];
    const shadow = scene.add.ellipse(x, y + 5, 8, 3, 0x000000, 0.2).setDepth(-499);
    const sprite = scene.add.image(x, y, item.tex, item.frame).setDepth(y + 8);
    const entry = { sprite, shadow, itemId, oneTimeId, x, y, ready, expires: lifetime ? scene.time.now + lifetime : Infinity, bob: null };
    if (ready) this.startBobbing(entry);
    this.floating.push(entry);
    return entry;
  }

  startBobbing(entry) {
    if (this.effects.reduced) return;
    entry.bob = this.scene.tweens.add({ targets: entry.sprite, y: entry.y - 2, duration: between(650, 950), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /** A piece of fruit falls from above and bounces to rest. */
  spawnDrop(x, y, itemId) {
    const scene = this.scene;
    const entry = this.spawnFloating(x, y - 20, itemId, null, DROP_LIFETIME, false);
    entry.sprite.setDepth(100000);
    entry.shadow.setAlpha(0);
    scene.tweens.add({
      targets: entry.sprite,
      y: y - 5,
      duration: this.effects.reduced ? 1 : 520,
      ease: 'Bounce.easeOut',
      onComplete: () => {
        entry.y = y - 5;
        entry.sprite.setDepth(y + 8);
        entry.shadow.setPosition(x, y).setAlpha(0.2);
        entry.ready = true;
        this.startBobbing(entry);
      }
    });
  }

  collectFloating(entry) {
    this.floating.splice(this.floating.indexOf(entry), 1);
    entry.bob?.stop();
    this.session.collect(entry.itemId, 1, entry.oneTimeId);
    this.effects.sparkle(entry.x, entry.y - 2);
    this.effects.itemFloater(entry.x, entry.y - 4, entry.itemId, 1);
    this.sound('found');
    entry.sprite.destroy();
    entry.shadow.destroy();
  }

  /* ---------------- trees, bushes, hives, chests ---------------- */

  addSpot(region, def) {
    if (!ICONS[def.kind]) throw new Error(`${region.id}: there is no kind of interactable called "${def.kind}"`);
    const { x, y } = this.pixels(region, def.at);
    const id = def.id || `${region.id}:${def.kind}:${def.at.join(',')}`;
    const spot = { id, kind: def.kind, def, x, y, icon: ICONS[def.kind], sprite: null };
    if (def.kind === 'chest') {
      const color = def.color || 'gold';
      const chest = this.art.chests[color];
      if (!chest) throw new Error(`${region.id}: chest "${id}" has unknown colour "${color}"`);
      const opened = this.session.hasCollected(id);
      spot.color = color;
      spot.sprite = this.scene.add.sprite(x, y, chest.tex, opened ? chest.frames[chest.frames.length - 1] : chest.frames[0]).setOrigin(0.5, 1).setDepth(y);
      // A chest is solid, like a rock.
      const world = this.scene.world;
      world.blocked[world.idx(region.ox + def.at[0], region.oy + def.at[1])] = 1;
    } else if (def.kind === 'mailbox') {
      this.addMailbox(region, def, spot);
    } else if (def.kind === 'fishing') {
      spot.region = region; // no picture: the player just stands on the spot
    } else {
      spot.sprite = this.scene.objectSprites.get(`${region.id}:${def.at[0]},${def.at[1]}`);
      if (!spot.sprite) throw new Error(`${region.id}: ${def.kind} at ${def.at} has no picture; place an object on that tile first`);
    }
    this.spots.push(spot);
  }

  /* ---------------- mailboxes ---------------- */

  letterKey(spot, index) {
    return `mail:${spot.id}:${index}`;
  }

  unreadLetters(spot) {
    return (spot.def.letters || []).map((letter, index) => ({ letter, index })).filter(({ index }) => !this.session.hasCollected(this.letterKey(spot, index)));
  }

  addMailbox(region, def, spot) {
    const m = this.art.mailbox;
    spot.sprite = this.scene.add.sprite(spot.x, spot.y, m.tex, m.closed).setOrigin(0.5, m.feetY / 48).setDepth(spot.y);
    const world = this.scene.world;
    world.blocked[world.idx(region.ox + def.at[0], region.oy + def.at[1])] = 1;
    this.showMailFlag(spot);
  }

  /** With letters waiting, the mailbox shows an envelope bubble that flips back and forth; without, it just stands there. */
  showMailFlag(spot) {
    const m = this.art.mailbox;
    spot.flag?.remove();
    spot.flag = null;
    if (!this.unreadLetters(spot).length) {
      spot.sprite.setFrame(m.closed);
      return;
    }
    spot.sprite.setFrame(m.mail[0]);
    if (this.effects.reduced) return;
    let step = 0;
    const timer = this.scene.time.addEvent({ delay: 500, loop: true, callback: () => spot.sprite.setFrame(m.mail[(step += 1) % 2]) });
    spot.flag = { remove: () => timer.remove() };
  }

  readMail(spot) {
    const unread = this.unreadLetters(spot);
    if (!unread.length) {
      this.effects.shake(spot.sprite, 0.5);
      this.sound('locked');
      return;
    }
    const m = this.art.mailbox;
    const { letter, index } = unread[0];
    spot.flag?.remove();
    spot.flag = null;
    this.session.change((s) => { s.collected.push(this.letterKey(spot, index)); });
    this.sound('mail');
    spot.sprite.setFrame(m.open[0]);
    this.scene.time.delayedCall(this.effects.reduced ? 50 : 350, () => {
      spot.sprite.setFrame(m.open[1]);
      this.effects.sparkle(spot.x, spot.y - 22, 6);
      const lines = [{ speaker: letter.from, portrait: letter.portrait || null, text: letter.text }];
      this.scene.scene.get('ui').say(lines, () => {
        if (letter.reward?.coins) {
          this.session.addCoins(letter.reward.coins);
          this.effects.coinFloater(spot.x, spot.y - 24, letter.reward.coins);
        }
        if (letter.reward?.item) {
          this.session.collect(letter.reward.item, 1);
          this.effects.itemFloater(spot.x, spot.y - 28, letter.reward.item, 1);
        }
        this.showMailFlag(spot);
      });
    });
  }

  /** The nearest tree, bush, hive or chest the player is close enough to use. */
  nearest(px, py) {
    let best = null;
    let bestDistance = USE_RANGE;
    for (const spot of this.spots) {
      const d = Math.hypot(spot.x - px, spot.y - 6 - py);
      if (d < bestDistance) {
        best = spot;
        bestDistance = d;
      }
    }
    return best;
  }

  /** Use it. Returns nothing; the effects, sounds and the save happen here. */
  use(spot) {
    const now = this.scene.time.now;
    const def = spot.def;
    const waiting = (this.readyAt.get(spot.id) || 0) > now;
    switch (spot.kind) {
      case 'tree':
      case 'bush': {
        if (waiting) {
          this.effects.shake(spot.sprite, 0.5);
          this.sound('locked');
          return;
        }
        this.effects.shake(spot.sprite, 1);
        this.sound('rustle', { vary: 0.5 });
        const count = randomInt(def.count || [1, 2]);
        for (let i = 0; i < count; i += 1) {
          this.sound('drop', { volume: 0.8, vary: 0.6, delay: 0.3 + i * 0.12 });
          const item = Array.isArray(def.item) ? pick(def.item) : def.item;
          this.spawnDrop(spot.x + between(-14, 14), spot.y + between(2, 14), item);
        }
        this.readyAt.set(spot.id, now + (def.cooldown || 40) * 1000);
        return;
      }
      case 'hive': {
        const questWants = this.session.rules.wantsHoney();
        if (waiting && !questWants) {
          this.effects.shake(spot.sprite, 0.5);
          this.sound('locked');
          return;
        }
        this.effects.shake(spot.sprite, 1);
        this.session.collect(def.item || 'honey', 1);
        this.effects.sparkle(spot.x, spot.y - 10);
        this.effects.itemFloater(spot.x, spot.y - 14, def.item || 'honey', 1);
        this.sound('honey');
        this.sound('found', { delay: 0.45 });
        this.readyAt.set(spot.id, now + (def.cooldown || 90) * 1000);
        if (questWants) this.scene.handleOutcome(this.session.rules.honeyGathered(this.scene.ruleContext()));
        return;
      }
      case 'crop':
        this.useCrop(spot);
        return;
      case 'chest':
        this.openChest(spot);
        return;
      case 'mailbox':
        this.readMail(spot);
        return;
      case 'fishing':
        this.fishing.use(spot);
        return;
      case 'treats':
        this.knock(spot);
        return;
      default:
    }
  }

  /** Trick or treat: knock on a house door, say the words, and get one candy. The door needs a minute before it opens again. */
  knock(spot) {
    const def = spot.def;
    const now = this.scene.time.now;
    const strings = this.scene.content.strings || {};
    const waiting = (this.readyAt.get(spot.id) || 0) > now;
    this.effects.shake(spot.sprite, 0.4);
    this.sound('door-open', { volume: 0.6, vary: 0.3 });
    const ui = this.scene.scene.get('ui');
    const me = this.session.state.profile.username || '';
    if (waiting) {
      ui.say([{ speaker: def.who || '', portrait: null, text: def.later || strings['treat.later'] || 'Nobody answers. Come back in a little while!' }]);
      return;
    }
    const item = pick(def.items);
    this.readyAt.set(spot.id, now + (def.cooldown || 60) * 1000);
    const lines = [
      { speaker: me, portrait: null, text: strings['treat.knock'] || 'TRICK OR TREAT!' },
      { speaker: def.who || '', portrait: null, text: def.reply }
    ];
    ui.say(lines, () => {
      this.session.collect(item, 1);
      this.effects.sparkle(spot.x, spot.y - 10);
      this.effects.itemFloater(spot.x, spot.y - 14, item, 1);
      this.sound('found');
    });
  }

  /** Show a plant at one of its growth pictures (the sheet has them side by side: seed, sprout, small, big, ripe). */
  setStage(spot, stage) {
    spot.stage = stage;
    if (stage === EMPTY) {
      spot.sprite.setVisible(false);
      if (!spot.dirt) spot.dirt = this.scene.add.ellipse(spot.x, spot.y - 4, 11, 5, 0x8c6a4a).setStrokeStyle(1, 0x6b4b3a).setDepth(spot.y - 1);
      spot.dirt.setVisible(true);
      return;
    }
    spot.sprite.setVisible(true);
    spot.dirt?.setVisible(false);
    const [, y, w, h] = spot.rect;
    const name = `rect:${16 + stage * 16},${y},${w},${h}`;
    const texture = this.scene.textures.get(spot.sprite.texture.key);
    if (!texture.has(name)) texture.add(name, 0, 16 + stage * 16, y, w, h);
    spot.sprite.setFrame(name);
  }

  saveStage(spot) {
    this.session.change((s) => { s.crops = s.crops || {}; s.crops[spot.id] = spot.stage; });
  }

  /** Use a plant: pick it if it is ripe, otherwise give it a drink so it grows. */
  useCrop(spot) {
    if (spot.stage === EMPTY) this.plant(spot);
    else if (spot.stage >= RIPE) this.harvest(spot);
    else this.water(spot);
  }

  /** Pick a ripe plant: it pops into the bag and a new seed is left in the soil. */
  harvest(spot) {
    const itemId = `veg-${spot.def.type.replace('crop_', '')}`;
    if (!this.art.items[itemId]) return;
    this.session.collect(itemId, 1);
    this.effects.hop(spot.sprite, 5);
    this.effects.sparkle(spot.x, spot.y - 8, 6);
    this.effects.itemFloater(spot.x, spot.y - 20, itemId, 1);
    this.session.collect('seeds', 1);
    this.effects.itemFloater(spot.x + 8, spot.y - 28, 'seeds', 1);
    this.sound('pick');
    this.sound('found', { volume: 0.7, delay: 0.2 });
    spot.sprite.clearTint();
    this.setStage(spot, EMPTY);
    this.saveStage(spot);
    this.readyAt.delete(spot.id);
  }

  /** Plant a seed in bare soil: what grew there grows again, starting as a seed in the ground. */
  plant(spot) {
    if (!this.session.state.bag.seeds) {
      this.sound('locked');
      this.scene.scene.get('ui').say([{ speaker: null, text: 'YOU NEED SEEDS TO PLANT. PICK A PLANT THAT IS READY AND YOU GET A SEED!' }]);
      return;
    }
    this.session.change((s) => { s.bag.seeds -= 1; });
    this.session.events.emit('gained', { item: 'seeds', count: 0 });
    this.setStage(spot, 0);
    this.saveStage(spot);
    this.effects.hop(spot.sprite, 3);
    this.effects.sparkle(spot.x, spot.y - 4, 5);
    this.sound('plant');
  }

  /** Water a plant: drops rain down, it hops, turns dark and wet and grows one step. The first time each plant gives a coin. */
  water(spot) {
    const scene = this.scene;
    const now = scene.time.now;
    if (!this.session.state.bag['watering-can']) {
      this.sound('locked');
      scene.scene.get('ui').say([{ speaker: null, text: 'YOU NEED A WATERING CAN TO WATER PLANTS. THE GARDENER LEFT ONE ON THE GROUND NEAR THE VEGETABLE FIELDS!' }]);
      return;
    }
    if ((this.readyAt.get(spot.id) || 0) > now) {
      this.effects.hop(spot.sprite, 2); // just watered: it wiggles happily
      this.sound('pet', { volume: 0.5, rate: 1.3, vary: 0.4 });
      return;
    }
    this.readyAt.set(spot.id, now + WET_MS);
    this.sound('water', { vary: 0.3 });
    this.waterDrops(spot);
    scene.time.delayedCall(this.effects.reduced ? 50 : 500, () => {
      spot.sprite.setTint(WET_TINT);
      this.setStage(spot, Math.min(RIPE, spot.stage + 1));
      this.saveStage(spot);
      this.effects.hop(spot.sprite, 4);
      this.effects.sparkle(spot.x, spot.y - 10, spot.stage >= RIPE ? 10 : 5);
      this.sound(spot.stage >= RIPE ? 'ripe' : 'grow', { volume: 0.8 });
      scene.time.delayedCall(WET_MS, () => spot.sprite.clearTint());
      const rules = this.session.rules;
      const questOut = rules.plantWatered(spot.id, scene.ruleContext());
      if (questOut.changed || questOut.lines.length) scene.handleOutcome(questOut);
      const key = `watered:${spot.id}`;
      if (this.session.hasCollected(key)) return;
      this.session.change((s) => s.collected.push(key));
      this.session.addCoins(1);
      this.effects.coinFloater(spot.x, spot.y - 20, 1);
      const helped = this.session.state.collected.filter((c) => c.startsWith('watered:')).length;
      if (helped === HELPER_TARGET) {
        this.session.addHearts(1);
        this.effects.heartFloater(spot.x, spot.y - 32);
      }
    });
  }

  /** A little watering can tips over the plant and rain falls from it. */
  waterDrops(spot) {
    const scene = this.scene;
    const can = scene.add.image(spot.x - 8, spot.y - 26, 'item-tools', 0).setDepth(100000);
    const rain = [];
    if (!this.effects.reduced) {
      scene.tweens.add({ targets: can, angle: -35, duration: 220, yoyo: true, hold: 260 });
      for (let i = 0; i < 7; i += 1) {
        const drop = scene.add.ellipse(spot.x - 12 + i * 2, spot.y - 22, 2, 3, 0x6fb7e8).setDepth(100000).setAlpha(0);
        rain.push(drop);
        scene.tweens.add({ targets: drop, y: spot.y - 6, alpha: { from: 1, to: 0.2 }, delay: 180 + i * 50, duration: 260, onComplete: () => drop.destroy() });
      }
    }
    scene.time.delayedCall(this.effects.reduced ? 50 : 700, () => { can.destroy(); rain.forEach((d) => d.destroy()); });
  }

  openChest(spot) {
    if (this.session.hasCollected(spot.id)) {
      this.sound('locked');
      return;
    }
    const scene = this.scene;
    const reward = spot.def.reward || { coins: [3, 6] };
    // Mark it opened straight away, so it cannot be opened twice.
    this.session.change((s) => { s.collected.push(spot.id); });
    this.sound('chest');
    spot.sprite.play(`chest-open-${spot.color}`);
    scene.time.delayedCall(this.effects.reduced ? 50 : 450, () => {
      this.effects.sparkle(spot.x, spot.y - 12, 10);
      if (reward.coins) {
        const coins = randomInt(reward.coins);
        this.session.addCoins(coins);
        this.effects.coinFloater(spot.x - 8, spot.y - 22, coins);
      }
      if (reward.item) {
        this.session.collect(reward.item, 1);
        this.effects.itemFloater(spot.x + 8, spot.y - 26, reward.item, 1);
      }
      this.sound('found');
    });
  }

  /* ---------------- every frame ---------------- */

  update() {
    this.fishing.update();
    const now = this.scene.time.now;
    const player = this.scene.player;
    const px = player.x;
    const py = player.y - 6;
    for (const entry of [...this.floating]) {
      if (!entry.ready) continue;
      if (now > entry.expires) {
        this.floating.splice(this.floating.indexOf(entry), 1);
        entry.bob?.stop();
        entry.sprite.destroy();
        entry.shadow.destroy();
      } else if (Math.hypot(entry.x - px, entry.y - py) < COLLECT_RADIUS) {
        this.collectFloating(entry);
      }
    }
  }
}
