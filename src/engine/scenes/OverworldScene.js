import Phaser from 'phaser';
import { F, TILE, buildWorld, setBlocker } from '../world/worldModel.js';
import { buildTerrain } from '../world/terrain.js';
import { CreatureManager } from '../systems/Creatures.js';
import { Life } from '../systems/Life.js';
import { Effects } from '../systems/Effects.js';
import { Pickups } from '../systems/Pickups.js';
import { Gates } from '../systems/Gates.js';
import { Rooms } from '../systems/Rooms.js';
import { CharacterWalker } from '../systems/Walkers.js';

const SPEED = 72; // pixels per second
const FEET = { halfWidth: 4, height: 5 }; // the part of the player that bumps into things
const PETTABLE = new Set(['hen', 'chick', 'cow', 'calf', 'bat', 'slime', 'ghost', 'crow']); // wandering animals that like being petted
const TALK_RANGE = 26; // pixels: how close the player must be to talk
const FOLLOW_GAP = 28; // pixels between the player and each animal following behind
const CHECK_MS = 250; // how often walking is checked against quest goals (like "bring the chicks home")
const STEP_EVERY = 11; // pixels walked between footstep sounds
// The sound each animal makes when petted (anything else gets a happy "boop").
const PET_VOICE = { hen: 'cluck', chick: 'peep', cow: 'moo', calf: 'moo', bat: 'squeak', slime: 'squish', ghost: 'ghost', crow: 'caw' };
const TREAT_PAUSE_MS = 900; // a friend took a treat: time to watch it leave the item bar before they say thank you

// Character sheets: columns back, back-left, left, front-left, front, front-right, right, back-right;
// rows left step, standing, right step.
const FACING_COLUMN = { up: 0, 'up-left': 1, left: 2, 'down-left': 3, down: 4, 'down-right': 5, right: 6, 'up-right': 7 };
const SECTOR_TO_FACING = { 0: 'right', 1: 'down-right', 2: 'down', 3: 'down-left', 4: 'left', '-4': 'left', '-3': 'up-left', '-2': 'up', '-1': 'up-right' };

const DEPTH = { water: -1000, ground: -900, room: -850, flat: -500 };
const SCREEN_FOR = { oven: 'cook', shop: 'shop' }; // things that open a screen when used
const QUIET = new Set(['prop']); // things that are only a picture (food set out on a picnic blanket)

export class OverworldScene extends Phaser.Scene {
  constructor() {
    super('overworld');
  }

  create() {
    this.content = this.registry.get('content');
    this.session = this.registry.get('session');
    const params = new URLSearchParams(window.location.search);
    this.debug = {
      overview: params.has('overview'),
      blocked: params.has('blocked'),
      coast: params.get('coast'),
      at: params.get('at'),
      room: params.get('room'), // ?room=<id> starts inside that room, by its door
      clean: params.has('clean') // map pictures: no animals, people or menus
    };

    this.world = buildWorld(this.content);
    this.registry.set('world', this.world);
    this.worldPx = { w: this.world.width * TILE, h: this.world.height * TILE };
    this.occluders = [];
    this.objectSprites = new Map(); // "region:x,y" -> the picture standing on that tile
    this.near = null;
    this.effects = new Effects(this);

    this.createCharacterAnimations();
    this.drawWater();
    this.drawTerrain(this.debug.coast || this.content.world.coastStyle || 'soft');
    this.drawForestCanopy();
    this.drawObjects();
    this.createNpcs();
    this.createThings();
    this.createWildlife();
    this.rooms = new Rooms(this); // the insides of houses, and their doors
    this.rooms.draw(DEPTH.room);
    this.createPlayer();
    this.rooms.placeFromPlayer();
    this.trail = []; // where the player has walked lately, oldest first: followers walk along it
    this.checkTimer = 0;
    this.syncQuestWorld(true);
    this.setupCamera();
    this.setupInput();
    if (this.debug.blocked) this.drawBlocked();

    this.scale.on('resize', this.fitCamera, this);
    this.game.events.on('ui-interact', this.interact, this);
    this.session.events.on('changed', this.applyProfile, this);
    this.session.events.on('changed', this.applyMotion, this);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.fitCamera, this);
      this.game.events.off('ui-interact', this.interact, this);
      this.session.events.off('changed', this.applyProfile, this);
      this.session.events.off('changed', this.applyMotion, this);
    });

    if (this.debug.clean) {
      for (const npc of this.npcs) npc.sprite.setVisible(false);
      this.playerSprite.setVisible(false);
      window.__GAME_DEBUG__ = { scene: this, world: this.world };
      return;
    }
    // The menus and buttons live in their own scene, drawn on top of this one.
    this.scene.launch('ui');
    // Once the UI is up: the first visit to this place, and any quest goal already met.
    this.time.delayedCall(400, () => this.handleOutcome(this.session.rules.enterArea(this.player.region, this.ruleContext())));

    // Handy in the browser console and for automated checks.
    window.__GAME_DEBUG__ = { scene: this, world: this.world };
  }

  /* ---------------- building the world ---------------- */

  createCharacterAnimations() {
    const { art } = this.content;
    for (const key of Object.keys(art.textures)) {
      if (!key.startsWith('char-')) continue;
      for (const [facing, col] of Object.entries(FACING_COLUMN)) {
        const animKey = `${key}-walk-${facing}`;
        if (this.anims.exists(animKey)) continue;
        this.anims.create({ key: animKey, frames: this.anims.generateFrameNumbers(key, { frames: [col, 8 + col, 16 + col, 8 + col] }), frameRate: 8, repeat: -1 });
      }
    }
  }

  drawWater() {
    const def = this.content.art.tilesets.water;
    const o = this.world.outdoor; // only under the islands, not round the rooms
    const water = this.add.tileSprite(o.x * TILE, o.y * TILE, o.width * TILE, o.height * TILE, def.texture, def.frames[0]).setOrigin(0, 0).setDepth(DEPTH.water);
    let i = 0;
    this.time.addEvent({
      delay: def.frameMs,
      loop: true,
      callback: () => {
        if (this.session.settings.reducedMotion) return; // "less motion": the water holds still
        i = (i + 1) % def.frames.length;
        water.setFrame(def.frames[i]);
      }
    });
  }

  /**
   * The stepping stone picture has small single stones with wide gaps, but the player walks a whole
   * tile. This builds tiles of three stones each (so the way across looks like a path you can
   * really walk on) and returns the new picture's name.
   */
  makeStoneClusters(sourceKey) {
    const key = `${sourceKey}-clusters`;
    if (this.textures.exists(key)) this.textures.remove(key);
    const source = this.textures.get(sourceKey).getSourceImage();
    const canvas = this.textures.createCanvas(key, 64, 48);
    const ctx = canvas.getContext();
    ctx.imageSmoothingEnabled = false;
    const big = [[8, 16, 7, 6], [8, 32, 7, 6], [34, 38, 7, 6], [44, 49, 7, 6], [8, 50, 7, 6], [8, 24, 6, 6], [1, 12, 6, 6], [17, 29, 6, 6], [25, 56, 6, 6]];
    const layouts = [[[5, 0], [0, 9], [9, 9]], [[0, 1], [9, 2], [4, 10]], [[1, 0], [8, 4], [2, 10]], [[9, 0], [1, 5], [8, 10]]];
    for (let cell = 0; cell < 12; cell += 1) {
      const ox = (cell % 4) * TILE;
      const oy = Math.floor(cell / 4) * TILE;
      layouts[cell % layouts.length].forEach(([x, y], i) => {
        const [sx, sy, w, h] = big[(cell * 3 + i * 2) % big.length];
        ctx.drawImage(source, sx, sy, w, h, ox + Math.min(x, TILE - w), oy + Math.min(y, TILE - h), w, h);
      });
    }
    canvas.refresh();
    return key;
  }

  drawTerrain(coastStyle) {
    const { width, height } = this.world;
    const tilesets = this.content.art.tilesets;
    const layers = buildTerrain(this.world, { ...tilesets, stones: { ...tilesets.stones, texture: this.makeStoneClusters(tilesets.stones.texture) } }, { coastStyle });
    layers.forEach((layer, i) => {
      const rows = [];
      for (let y = 0; y < height; y += 1) rows.push(Array.from(layer.data.subarray(y * width, (y + 1) * width)));
      const map = this.make.tilemap({ data: rows, tileWidth: TILE, tileHeight: TILE });
      const tileset = map.addTilesetImage(layer.texture, layer.texture, TILE, TILE, 0, 0);
      map.createLayer(0, tileset, 0, 0).setDepth(DEPTH.ground + i);
    });
  }

  /**
   * Treetops over the inside of every forest, so a big forest looks like a crowd of leafy trees
   * instead of a flat green block (art.json tilesets.hedge.canopy). One treetop per
   * spacing x spacing square, at a spot that always comes out the same, and only where the
   * forest is at least two tiles deep all round, so no treetop ever hangs over a path.
   */
  drawForestCanopy() {
    const canopy = this.content.art.tilesets.hedge?.canopy;
    const defs = this.content.art.objects;
    if (!canopy?.objects?.length) return;
    const { width, height } = this.world;
    const step = Math.max(2, canopy.spacing || 3);
    const hedge = (x, y) => x < 0 || y < 0 || x >= width || y >= height || this.world.has(x, y, F.HEDGE);
    const deep = (x, y) => {
      for (let dy = -2; dy <= 1; dy += 1) for (let dx = -2; dx <= 2; dx += 1) if (!hedge(x + dx, y + dy)) return false;
      return true;
    };
    const hash = (x, y, n) => {
      let h = (x * 374761393 + y * 668265263 + n * 2246822519) >>> 0;
      h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
      return (h ^ (h >>> 16)) >>> 0;
    };
    for (let gy = 0; gy < height; gy += step) {
      for (let gx = 0; gx < width; gx += step) {
        const x = gx + (hash(gx, gy, 1) % step);
        const y = gy + (hash(gx, gy, 2) % step);
        if (x >= width || y >= height || !this.world.has(x, y, F.HEDGE) || !deep(x, y)) continue;
        if (this.world.regionAt(x, y)?.canopy === false) continue; // a region drawn as hedge rooms (woods.json "canopy": false)
        const type = canopy.objects[hash(gx, gy, 3) % canopy.objects.length];
        const def = defs[type];
        if (!def) continue;
        const px = x * TILE + TILE / 2 + ((hash(gx, gy, 4) % 7) - 3);
        const py = (y + 1) * TILE + ((hash(gx, gy, 5) % 5) - 2);
        const image = this.add.image(px, py, def.tex, this.frameFor(def)).setOrigin(0.5, 1).setDepth(py);
        if (hash(gx, gy, 6) % 2) image.setFlipX(true);
      }
    }
  }

  /** Texture frame for an art.json object: a numbered frame, or a rectangle cut from the sheet. */
  frameFor(def) {
    if (!def.rect) return def.frame ?? 0;
    const texture = this.textures.get(def.tex);
    const name = `rect:${def.rect.join(',')}`;
    if (!texture.has(name)) texture.add(name, 0, def.rect[0], def.rect[1], def.rect[2], def.rect[3]);
    return name;
  }

  drawObjects() {
    const defs = this.content.art.objects;
    for (const region of this.world.regions) {
      for (const obj of region.objects || []) {
        const def = defs[obj.type];
        if (!def) {
          console.warn(`[world] ${region.id}: unknown object "${obj.type}" at ${obj.at}`);
          continue;
        }
        const image = this.placePicture(def, region, obj.at);
        if (def.occlude) this.occluders.push(image);
        const key = `${region.id}:${obj.at[0]},${obj.at[1]}`;
        if (!this.objectSprites.has(key)) this.objectSprites.set(key, image);
      }
    }
  }

  /**
   * An art.json object's picture standing on a region tile. "offset" moves the picture; "raise" lifts it
   * (food on a counter) but it still sorts by its own tile, so it draws in front of the counter;
   * "anim" plays an animation from art.json (the oven's fire), which holds still with "less motion".
   */
  placePicture(def, region, at) {
    const [ox, oy] = def.offset || [0, 0];
    const x = (region.ox + at[0]) * TILE + TILE / 2 + ox;
    const y = (region.oy + at[1] + 1) * TILE + oy;
    const lift = def.raise || 0;
    const moving = def.anim && this.anims.exists(def.anim);
    const image = (moving ? this.add.sprite(x, y - lift, def.tex, this.frameFor(def)) : this.add.image(x, y - lift, def.tex, this.frameFor(def))).setOrigin(0.5, 1);
    image.setDepth(def.flat ? DEPTH.flat + y / 1000 : y + (lift ? 0.5 : 0));
    if (moving) {
      image.play({ key: def.anim, startFrame: Math.abs(at[0] * 7 + at[1] * 3) % this.anims.get(def.anim).frames.length });
      this.animated = this.animated || [];
      this.animated.push(image);
      if (this.session.settings.reducedMotion) image.anims.pause();
    }
    return image;
  }

  /** "Less motion" was switched: pictures that move (the oven's fire) hold still, or move again. */
  applyMotion() {
    const still = this.session.settings.reducedMotion;
    for (const sprite of this.animated || []) {
      if (still && !sprite.anims.isPaused) sprite.anims.pause();
      else if (!still && sprite.anims.isPaused) sprite.anims.resume();
    }
  }

  createNpcs() {
    this.npcs = [];
    this.walkers = []; // people who can walk behind the player (lost friends)
    this.creatures = new CreatureManager(this, this.world, this.content.art);
    for (const region of this.world.regions) {
      for (const npc of region.npcs || []) {
        const x = (region.ox + npc.at[0]) * TILE + TILE / 2;
        const y = (region.oy + npc.at[1] + 1) * TILE;
        let sprite;
        let creature = null;
        if (npc.critter) {
          // An animal you can talk to that also wanders about.
          creature = this.creatures.add(region, { ...npc.critter, at: npc.at, id: npc.id });
          sprite = creature.sprite;
        } else if (npc.character) {
          const look = this.session.rules.lookOf(npc);
          const texture = this.content.characters[look.character]?.texture;
          if (!texture) throw new Error(`${region.id}: npc "${npc.id}" uses unknown character "${look.character}"`);
          sprite = this.add.sprite(x, y, texture, 8 + FACING_COLUMN[npc.facing || 'down']);
          sprite.setOrigin(0.5, 1).setDepth(y);
          if (npc.kind === 'follower') {
            // A lost friend who can walk behind the player.
            creature = new CharacterWalker(this, sprite, texture, npc.facing || 'down');
            this.walkers.push(creature);
          }
        } else {
          sprite = this.add.sprite(x, y, npc.sprite, 0);
          if (npc.anim && this.anims.exists(npc.anim)) sprite.play({ key: npc.anim, startFrame: npc.at[0] % 4 });
          sprite.setOrigin(0.5, 1).setDepth(y);
        }
        this.npcs.push({ def: npc, sprite, creature, isCharacter: Boolean(npc.character), emote: null, removeEmote: null, hidden: false });
      }
    }
  }

  /**
   * Things the quests use that are not people: clues to look at, items to pick up.
   * Each is a region "entities" entry with a picture from art.json objects, e.g.
   * { "id": "forest-basket", "kind": "clue", "object": "picnic_basket", "at": [12, 8], "foundSay": [...] }.
   */
  createThings() {
    this.things = [];
    const defs = this.content.art.objects;
    for (const region of this.world.regions) {
      for (const def of region.entities || []) {
        const art = defs[def.object];
        if (!art) {
          console.warn(`[world] ${region.id}: "${def.id}" uses unknown object "${def.object}"`);
          continue;
        }
        const sprite = this.placePicture(art, region, def.at);
        this.things.push({ def, sprite, region, emote: null, removeEmote: null, hidden: false });
      }
    }
  }

  /** Animals that only wander about, and the small things that make the world feel alive. */
  createWildlife() {
    this.life = new Life(this, this.content.art);
    this.pickups = new Pickups(this);
    this.gates = new Gates(this);
    for (const region of this.world.regions) {
      if (!this.debug.clean) {
        for (const def of region.critters || []) this.creatures.add(region, def);
        for (const def of region.life || []) this.life.add(region, def);
      }
      this.pickups.addRegion(region);
      this.gates.addRegion(region);
    }
  }

  characterWorldScale(texture) {
    const art = this.content.art.textures[texture];
    return (art?.worldSize || 32) / (art?.frame?.[0] || 32);
  }

  createPlayer() {
    const start = this.content.world.start;
    const region = this.world.regions.find((r) => r.id === start.region) || this.world.regions[0];
    const saved = this.session.state.player;
    let x = (region.ox + start.at[0]) * TILE + TILE / 2;
    let y = (region.oy + start.at[1] + 1) * TILE - 2;
    let facing = start.facing || 'down';
    const debugRoom = this.debug.room && this.world.rooms.find((r) => r.id === this.debug.room);
    if (debugRoom) {
      x = (debugRoom.ox + debugRoom.exit[0]) * TILE + TILE / 2;
      y = (debugRoom.oy + debugRoom.exit[1]) * TILE - 2;
      facing = 'up';
    } else if (this.debug.at) {
      // ?at=x,y starts somewhere else (a tile in the start region), for testing.
      const [sx, sy] = this.debug.at.split(',').map(Number);
      x = (region.ox + sx) * TILE + TILE / 2;
      y = (region.oy + sy + 1) * TILE - 2;
    } else if (saved && saved.x != null) {
      const room = saved.room && this.world.rooms.find((r) => r.id === saved.room);
      const spot = room ? { x: room.ox * TILE + saved.roomX, y: room.oy * TILE + saved.roomY } : { x: saved.x, y: saved.y };
      if (!this.blockedAt(spot.x, spot.y)) {
        x = spot.x;
        y = spot.y;
        facing = saved.facing || facing;
      }
    }
    this.player = { x, y, facing, texture: this.session.playerTexture(), moving: false, region: region.id };
    this.playerSprite = this.add.sprite(x, y, this.player.texture, 8 + FACING_COLUMN[facing]).setOrigin(0.5, 1).setDepth(y);
    this.playerSprite.setScale(this.characterWorldScale(this.player.texture));
  }

  /** The player picked a different character on the start screen: switch the picture. */
  applyProfile() {
    const texture = this.session.playerTexture();
    if (!texture || texture === this.player.texture) return;
    this.player.texture = texture;
    this.playerSprite.stop();
    this.playerSprite.setTexture(texture, 8 + FACING_COLUMN[this.player.facing]);
    this.playerSprite.setScale(this.characterWorldScale(texture));
    if (this.player.moving) this.playerSprite.play(`${texture}-walk-${this.player.facing}`, true);
  }

  setupCamera() {
    const cam = this.cameras.main;
    cam.setRoundPixels(true);
    cam.setBackgroundColor(0x9bd4c3);
    if (!this.debug.overview) cam.startFollow(this.playerSprite, true);
    this.fitCamera();
  }

  fitCamera() {
    const cam = this.cameras.main;
    const { width, height } = this.scale;
    if (this.debug.overview) {
      const o = this.world.outdoor;
      const fit = Math.min(width / (o.width * TILE), height / (o.height * TILE));
      cam.setZoom(fit >= 1 ? Math.floor(fit) : fit);
      cam.setBounds(o.x * TILE, o.y * TILE, o.width * TILE, o.height * TILE);
      cam.centerOn((o.x + o.width / 2) * TILE, (o.y + o.height / 2) * TILE);
      return;
    }
    // Whole-number zoom keeps the pixels crisp; aim for about 22 x 13 tiles on screen.
    cam.setZoom(Phaser.Math.Clamp(Math.round(Math.min(width / (22 * TILE), height / (13 * TILE))), 2, 4));
    this.rooms.applyCamera(); // islands, or the room (in the middle when it is smaller than the screen)
  }

  setupInput() {
    // Keys are read here, but never "captured", so typing in a text box works normally.
    this.keys = this.input.keyboard.addKeys({
      up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT',
      w: 'W', a: 'A', s: 'S', d: 'D'
    }, false);
    // Tap to walk to a spot, or hold and drag to steer. A tap that lands on a button is left to the UI.
    this.walkTarget = null;
    this.steering = false;
    this.pendingTap = null;
    this.input.on('pointerdown', (pointer) => {
      this.pendingTap = pointer;
    });
    this.input.on('pointermove', (pointer) => {
      if (this.steering && pointer.isDown) this.aimAt(pointer);
    });
    this.input.on('pointerup', (pointer) => {
      // A quick tap keeps walking to the spot; letting go after holding stops.
      if (this.steering && pointer.getDuration() > 300) this.walkTarget = null;
      this.steering = false;
    });
  }

  aimAt(pointer) {
    const p = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    this.walkTarget = { x: p.x, y: p.y };
  }

  drawBlocked() {
    const g = this.add.graphics().setDepth(100000);
    g.fillStyle(0xff0000, 0.35);
    for (let y = 0; y < this.world.height; y += 1) {
      for (let x = 0; x < this.world.width; x += 1) {
        if (this.world.isBlocked(x, y)) g.fillRect(x * TILE, y * TILE, TILE, TILE);
      }
    }
  }

  /* ---------------- talking ---------------- */

  /**
   * Whatever the player is close enough to use: an animal or person to talk to, or a tree,
   * bush, hive or chest. Tells the UI when that changes, so the button can show the right picture.
   */
  refreshNear() {
    let best = null;
    let bestDistance = TALK_RANGE;
    for (const npc of this.npcs) {
      if (npc.hidden || npc.creature?.guide) continue; // hidden, or trailing behind (not in the way of talking to others)
      const d = Math.hypot(npc.sprite.x - this.player.x, npc.sprite.y - this.player.y);
      if (d < bestDistance) {
        best = { kind: 'npc', icon: 'talk', npc };
        bestDistance = d;
      }
    }
    for (const thing of this.things) {
      if (thing.hidden || QUIET.has(thing.def.kind)) continue;
      const d = Math.hypot(thing.sprite.x - this.player.x, thing.sprite.y - this.player.y);
      if (d < bestDistance) {
        best = { kind: 'thing', icon: thing.def.kind === 'blocker' ? 'talk' : 'star', thing };
        bestDistance = d;
      }
    }
    const spot = this.pickups.nearest(this.player.x, this.player.y - 6);
    if (spot) {
      const d = Math.hypot(spot.x - this.player.x, spot.y - 6 - (this.player.y - 6));
      if (d < bestDistance) best = { kind: 'spot', icon: spot.icon, spot };
    }
    // Animals that just wander about can be petted (frogs and fish cannot), but people and things to use come first.
    for (const creature of this.creatures.creatures) {
      if (best && best.kind !== 'pet') break;
      if (creature.isNpc || !PETTABLE.has(creature.kind)) continue;
      const d = Math.hypot(creature.sprite.x - this.player.x, creature.sprite.y - this.player.y);
      if (d < bestDistance) {
        best = { kind: 'pet', icon: 'heart', creature };
        bestDistance = d;
      }
    }
    const same = best && this.near && best.kind === this.near.kind && (best.npc || best.spot || best.creature || best.thing) === (this.near.npc || this.near.spot || this.near.creature || this.near.thing);
    if (same || (!best && !this.near)) return;
    this.near = best;
    this.game.events.emit('near-changed', best ? { kind: best.kind, icon: best.icon } : null);
  }

  /** The talk button, E, Space or Enter was pressed (the UI decides when that means "use"). */
  interact() {
    if (this.registry.get('uiBusy') || this.holdStill || !this.near) return;
    if (this.near.kind === 'spot') {
      this.pickups.use(this.near.spot);
      return;
    }
    if (this.near.kind === 'pet') {
      this.pet(this.near.creature);
      return;
    }
    if (this.near.kind === 'thing') {
      const def = this.near.thing.def;
      const screen = SCREEN_FOR[def.kind];
      const ui = this.scene.get('ui');
      if (screen && ui.hasScreen(screen)) {
        // The oven or a shop counter: its own screen (cooking, buying and selling).
        this.registry.get('audio')?.play('tap', { volume: 0.7 });
        ui.open(screen, { data: def });
        return;
      }
      this.handleOutcome(this.session.rules.interact(def.id, this.ruleContext()));
      return;
    }
    const npc = this.near.npc;
    if (npc.isCharacter) {
      // Turn to face the player.
      const sector = Math.round(Math.atan2(this.player.y - npc.sprite.y, this.player.x - npc.sprite.x) / (Math.PI / 4));
      npc.sprite.setFrame(8 + FACING_COLUMN[SECTOR_TO_FACING[sector] || 'down']);
    }
    if (npc.creature) {
      npc.creature.faceTowards(this.player.x);
      npc.creature.pause(true);
      this.kindnessHeart(npc.creature, npc.def.id);
    }
    // Cats say meow and ghosts say oooo before they talk.
    const voice = /^cat-/.test(npc.def.id) ? 'meow' : /^ghost-/.test(npc.def.id) ? 'ghost' : null;
    if (voice) this.registry.get('audio')?.play(voice, { volume: 0.6, vary: 0.5 });
    const out = this.session.rules.interact(npc.def.id, this.ruleContext());
    if (out.shared) this.treatTaken(npc, out.shared);
    // After a treat, the thank-you waits a moment so the treat can be seen leaving the item bar (hidden while someone talks).
    this.handleOutcome(out, () => npc.creature?.pause(false), out.shared ? TREAT_PAUSE_MS : 0);
  }

  /** A friend took a treat: it floats up over them ("-1"), a heart pops, and their first treat gives a kindness heart. */
  treatTaken(npc, shared) {
    const sprite = npc.sprite;
    const top = sprite.y - sprite.displayHeight + 4;
    this.effects.itemFloater(sprite.x, top, shared.item, -1);
    this.effects.emote(sprite, 'heart', 1800);
    this.effects.hop(sprite, 4);
    if (shared.heart) this.time.delayedCall(450, () => this.effects.heartFloater(sprite.x + 22, top + 4));
    if (shared.favourite) {
      // Their favourite: a ring of hearts bursts out, a sparkle and a second hop.
      this.effects.heartBurst(sprite.x, top + 8);
      this.effects.sparkle(sprite.x, top + 4, 10);
      this.time.delayedCall(260, () => this.effects.hop(sprite, 6));
    }
  }

  /* ---------------- quests ---------------- */

  /** Where the player is, in the words the quest rules understand. */
  ruleContext() {
    const p = this.player;
    return { area: p.region, tile: { x: Math.floor(p.x / TILE), y: Math.floor((p.y - 1) / TILE) } };
  }

  /**
   * Show what the quest rules decided: save, play the sounds, hand out prizes, drop in the
   * "New quest!" signs, move the followers, then show the speech (and the ending, if it is time).
   */
  handleOutcome(out, onDone, speechDelay = 0) {
    const ui = this.scene.get('ui');
    if (out.changed) this.session.change(() => {});
    const audio = this.registry.get('audio');
    for (const id of new Set(out.sounds)) audio?.play(id);
    for (const gain of out.gained || []) this.session.events.emit('gained', gain);
    for (const notice of out.notices) ui.notify?.(notice);
    this.syncQuestWorld();
    this.celebrate(out);
    const finish = () => {
      onDone?.();
      this.checkEnding();
    };
    if (out.lines.length && speechDelay) {
      // Stand still until the speech box opens.
      this.holdStill = true;
      this.time.delayedCall(speechDelay, () => {
        this.holdStill = false;
        ui.say(out.lines, finish);
      });
    } else if (out.lines.length) ui.say(out.lines, finish);
    else finish();
  }

  /** A finished quest: confetti over the player, and the one who asked for help is overjoyed. */
  celebrate(out) {
    for (const notice of out.notices) {
      if (notice.kind !== 'questDone') continue;
      this.effects.confetti(this.player.x, this.player.y - 20);
      // The one who asked for help (and whoever says the last words, if that is someone else) is overjoyed.
      const quest = this.content.quests[notice.quest];
      const happy = new Set([quest?.giver, quest?.complete?.speaker].filter(Boolean));
      for (const npc of this.npcs) {
        if (!happy.has(npc.def.id) || npc.hidden) continue;
        this.effects.emote(npc.sprite, 'heart', 2200);
        this.effects.hop(npc.sprite, 6);
      }
    }
  }

  /** Every quest finished: show the ending screen, once. */
  checkEnding() {
    const rules = this.session.rules;
    if (!rules.allQuestsComplete() || this.session.state.endingSeen) return;
    this.session.change((s) => { s.endingSeen = true; });
    this.scene.get('ui').open('ending');
  }

  /**
   * Make the world match the saved quest state: animals following the player walk behind,
   * animals brought home stay with their family, and bubbles show who needs help
   * ("!" over someone with a quest to give, "?" over someone lost).
   * `loading` puts everything straight into place instead of walking there.
   */
  syncQuestWorld(loading = false) {
    const rules = this.session.rules;
    for (const npc of this.npcs) {
      const e = npc.def;
      const status = rules.entityStatus(e.id);
      const creature = npc.creature;
      if (e.kind === 'follower' && creature) {
        if (status === 'following' && !creature.guide) {
          const index = () => Math.max(0, rules.state.followers.indexOf(e.id));
          if (!loading) this.effects.emote(npc.sprite, 'heart');
          if (loading) {
            creature.x = this.player.x;
            creature.y = this.player.y;
            creature.sprite.setPosition(creature.x, creature.y);
          } else {
            this.trail.unshift({ x: creature.x, y: creature.y }); // start its path from where it stands
          }
          creature.leader = null;
          creature.guide = () => this.trailPoint(FOLLOW_GAP * (index() + 1));
        } else if (status === 'home' && !creature.settled) {
          creature.settled = true;
          if (!loading) this.time.delayedCall(600, () => this.effects.emote(npc.sprite, 'heart', 1800));
          creature.settleWith(this.creatures.byId.get(e.homeWith) || this.npcs.find((n) => n.def.id === e.homeWith)?.sprite || null, loading);
        }
      }
      // Someone who only turns up at the right moment in a story ("visibleWhen" / "hiddenWhen").
      const present = rules.isPresent(e);
      if (present === npc.hidden) {
        npc.hidden = !present;
        npc.sprite.setVisible(present);
        if (present && !loading) {
          this.effects.sparkle(npc.sprite.x, npc.sprite.y - 10, 10);
          this.effects.hop(npc.sprite, 5);
        }
      }
      let icon = e.emote || null;
      const givesQuest = Object.entries(rules.quests).some(([id, q]) => q.giver === e.id && rules.questState(id).status === 'not_started' && rules.check(q.requires));
      if (givesQuest) icon = 'exclaim';
      else if (e.kind === 'follower' && status === 'wild') icon = 'question';
      if (npc.hidden) icon = null;
      if (icon !== npc.emote) {
        npc.removeEmote?.();
        npc.removeEmote = icon ? this.effects.attachEmote(npc.sprite, icon) : null;
        npc.emote = icon;
      }
    }
    for (const thing of this.things) {
      const e = thing.def;
      const present = rules.isPresent(e);
      if (e.kind === 'blocker' && present === thing.hidden) {
        // A log or bush moved out of the way (or back): the path opens with a sparkle.
        setBlocker(this.world, thing.region, e, this.content.art.objects, present);
        if (!present && !loading) this.effects.sparkle(thing.sprite.x, thing.sprite.y - 6, 14);
      }
      const found = rules.state.clues.includes(e.id);
      if (found && thing.found === false && !loading) {
        this.effects.sparkle(thing.sprite.x, thing.sprite.y - 6, 8);
        this.effects.hop(thing.sprite, 3);
      }
      thing.found = found;
      if (present && thing.hidden && !loading && e.kind !== 'blocker') this.effects.sparkle(thing.sprite.x, thing.sprite.y - 6, 8); // it turns up (food set out on a blanket)
      if (!present && !thing.hidden && !loading && e.kind === 'item') this.effects.sparkle(thing.sprite.x, thing.sprite.y - 6, 10); // picked up (a crystal)
      thing.hidden = !present;
      thing.sprite.setVisible(present);
      // A star over a clue or item the current quest step is looking for.
      const wanted = present && !rules.state.clues.includes(e.id) && Object.keys(rules.state.quests).some((q) => {
        const step = rules.currentStep(q);
        return Boolean(step && ((step.clues || []).includes(e.id) || (step.items || [step.item]).includes(e.id) || (step.type === 'bring' && step.target === e.id)));
      });
      const icon = wanted ? 'star' : null;
      if (icon !== thing.emote) {
        thing.removeEmote?.();
        thing.removeEmote = icon ? this.effects.attachEmote(thing.sprite, icon) : null;
        thing.emote = icon;
      }
    }
  }

  /** The spot `distance` pixels back along the path the player walked. */
  trailPoint(distance) {
    let left = distance;
    let x = this.player.x;
    let y = this.player.y;
    for (let i = this.trail.length - 1; i >= 0; i -= 1) {
      const p = this.trail[i];
      const d = Math.hypot(p.x - x, p.y - y);
      if (d >= left) {
        const t = left / d;
        return { x: x + (p.x - x) * t, y: y + (p.y - y) * t };
      }
      left -= d;
      x = p.x;
      y = p.y;
    }
    return this.trail.length ? { x, y } : null;
  }

  /** Remember the path, and now and then ask the quest rules whether walking here finished a goal. */
  trackWalking(delta) {
    const last = this.trail[this.trail.length - 1];
    if (!last || Math.hypot(this.player.x - last.x, this.player.y - last.y) >= 2) {
      this.trail.push({ x: this.player.x, y: this.player.y });
      if (this.trail.length > 400) this.trail.shift();
    }
    this.checkTimer += delta;
    if (this.checkTimer < CHECK_MS || !this.session.state.followers.length) return;
    this.checkTimer = 0;
    const out = this.session.rules.playerMoved(this.ruleContext());
    if (out.changed || out.lines.length) {
      this.walkTarget = null;
      this.handleOutcome(out);
    }
  }

  /** Pet an animal: it looks happy, a heart pops up, and the first time it gives a kindness heart. */
  pet(creature) {
    creature.faceTowards(this.player.x);
    creature.love();
    this.effects.emote(creature.sprite, 'heart');
    this.registry.get('audio')?.play(PET_VOICE[creature.kind] || 'pet', { volume: 0.7, vary: 0.4 });
    this.kindnessHeart(creature, creature.id);
  }

  /** One kindness heart for being nice to this animal or friend, only ever once. */
  kindnessHeart(creature, id) {
    const key = `pet:${id}`;
    if (this.session.hasCollected(key)) return;
    this.session.change((s) => s.collected.push(key));
    this.session.addHearts(1);
    this.effects.heartFloater(creature.sprite.x, creature.sprite.y - creature.sprite.displayHeight + 4);
  }

  /* ---------------- every frame ---------------- */

  update(time, delta) {
    const busy = this.registry.get('uiBusy') || this.rooms.busy || this.holdStill;
    let dx = 0;
    let dy = 0;
    if (busy) {
      // A menu or the speech box is open: stand still.
      this.walkTarget = null;
      this.steering = false;
      this.pendingTap = null;
    } else {
      const k = this.keys;
      dx = (k.right.isDown || k.d.isDown ? 1 : 0) - (k.left.isDown || k.a.isDown ? 1 : 0);
      dy = (k.down.isDown || k.s.isDown ? 1 : 0) - (k.up.isDown || k.w.isDown ? 1 : 0);
      if (this.pendingTap) {
        const tap = this.pendingTap;
        this.pendingTap = null;
        if (!tap.uiHandled) {
          const point = this.cameras.main.getWorldPoint(tap.x, tap.y);
          const target = this.tapTarget(point.x, point.y);
          const doorWalk = !target && this.rooms.tapWalk(point.x, point.y);
          if (doorWalk) {
            // Tapped a doorway: walk to it and on through.
            this.steering = false;
            this.useOnArrive = null;
            this.walkTarget = doorWalk;
          } else if (target) {
            // Tapped someone or something: walk over and use it when close enough.
            this.steering = false;
            this.useOnArrive = target;
            this.walkTarget = this.approachSpot(target);
          } else {
            this.useOnArrive = null;
            this.steering = tap.isDown;
            this.aimAt(tap);
          }
        }
      }
      if (dx || dy) {
        this.walkTarget = null;
        this.useOnArrive = null;
      } else if (this.useOnArrive?.moves && this.walkTarget) {
        this.walkTarget = this.approachSpot(this.useOnArrive); // follow an animal that wanders off
      }
      if (!dx && !dy && this.walkTarget) {
        const tx = this.walkTarget.x - this.player.x;
        const ty = this.walkTarget.y - this.player.y;
        if (Math.hypot(tx, ty) < 3) {
          this.walkTarget = this.walkTarget.next || null; // a walk in two legs (to a doorway, then through it)
        } else {
          dx = tx;
          dy = ty;
        }
      }
    }
    this.movePlayer(dx, dy, delta);
    this.rooms.update();
    if (this.player.moving && !busy) this.trackWalking(delta);
    this.creatures.update(delta);
    for (const walker of this.walkers) walker.update(Math.min(delta, 100) / 1000);
    this.effects.update(time);
    this.life.update(delta);
    this.pickups.update();
    this.gates.update(time, delta);
    this.refreshNear();
    if (this.useOnArrive && !busy) {
      if (this.nearIs(this.useOnArrive)) {
        this.useOnArrive = null;
        this.walkTarget = null;
        this.interact();
      } else if (!this.walkTarget) {
        this.useOnArrive = null; // could not get there
      }
    }
    this.updateOcclusion();
    const room = this.rooms.current?.room;
    // Which island the player is on (kept while crossing water or a bridge), for the nature sounds and the music.
    const here = this.world.regionAt(Math.floor(this.player.x / TILE), Math.floor((this.player.y - 1) / TILE));
    if (here && here.kind !== 'room') this.soundRegion = here.id;
    const place = room ? [room.style, 'room'] : [this.soundRegion || this.player.region];
    this.registry.get('audio')?.nature?.update(delta, place);
    this.registry.get('audio')?.music?.update(delta, place);
  }

  /**
   * What a tap on the world lands on: a person, an animal to pet, a clue, or a tree, bush, hive,
   * chest, mailbox or fishing spot. Returns { ref, sprite, moves } or null for plain ground.
   */
  tapTarget(x, y) {
    const hits = [];
    const consider = (ref, sprite, moves, pad = 6) => {
      if (!sprite?.visible) return;
      const b = sprite.getBounds();
      if (x < b.left - pad || x > b.right + pad || y < b.top - pad || y > b.bottom + pad) return;
      hits.push({ ref, sprite, moves, d: Math.hypot(b.centerX - x, b.centerY - y) });
    };
    for (const npc of this.npcs) if (!npc.hidden && !npc.creature?.guide) consider(npc, npc.sprite, Boolean(npc.creature));
    for (const thing of this.things) if (!thing.hidden && !QUIET.has(thing.def.kind)) consider(thing, thing.sprite, false);
    for (const creature of this.creatures.creatures) if (!creature.isNpc && PETTABLE.has(creature.kind)) consider(creature, creature.sprite, true);
    for (const spot of this.pickups.spots) {
      if (spot.sprite) consider(spot, spot.sprite, false, 2);
      else if (Math.hypot(spot.x - x, spot.y - 8 - y) < 14) hits.push({ ref: spot, sprite: { x: spot.x, y: spot.y }, moves: false, d: 0 });
    }
    if (!hits.length) return null;
    hits.sort((a, b) => a.d - b.d);
    return hits[0];
  }

  /** Where to stand to use a tapped target: beside it on the player's side, else below, the other side or above. */
  approachSpot(target) {
    const tx = target.sprite.x;
    const ty = target.sprite.y;
    const side = this.player.x <= tx ? -1 : 1;
    const options = [[side * 14, 0], [0, 12], [-side * 14, 0], [0, -10], [side * 12, 10], [-side * 12, 10]];
    for (const [ox, oy] of options) {
      if (!this.blockedAt(tx + ox, ty + oy)) return { x: tx + ox, y: ty + oy };
    }
    return { x: tx, y: ty + 12 };
  }

  /** Is the thing the use button would use right now the tapped target? */
  nearIs(target) {
    const n = this.near;
    return Boolean(n) && (n.npc === target.ref || n.thing === target.ref || n.spot === target.ref || n.creature === target.ref);
  }

  movePlayer(dx, dy, delta) {
    const p = this.player;
    const sprite = this.playerSprite;
    if (!dx && !dy) {
      if (p.moving) {
        p.moving = false;
        sprite.stop();
        sprite.setFrame(8 + FACING_COLUMN[p.facing]);
        this.savePlayer();
      }
      return;
    }
    const len = Math.hypot(dx, dy);
    const step = (SPEED * Math.min(delta, 50)) / 1000;
    const mx = (dx / len) * step;
    const my = (dy / len) * step;
    let moved = false;
    if (mx && !this.blockedAt(p.x + mx, p.y)) { p.x += mx; moved = true; }
    if (my && !this.blockedAt(p.x, p.y + my)) { p.y += my; moved = true; }
    if (!moved && this.walkTarget) this.walkTarget = null; // walked into a wall: give up
    if (moved) {
      this.centreOnBridge(step);
      this.stepDistance = (this.stepDistance || 0) + step;
      if (this.stepDistance >= STEP_EVERY) {
        this.stepDistance = 0;
        this.footstep();
      }
    }

    const sector = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
    const facing = SECTOR_TO_FACING[sector] || p.facing;
    if (!moved) {
      // Pushing against water or a wall: turn to face it but stand still (no walking on the spot).
      p.facing = facing;
      if (p.moving) {
        p.moving = false;
        sprite.stop();
      }
      sprite.setFrame(8 + FACING_COLUMN[facing]);
      return;
    }
    if (facing !== p.facing || !p.moving) {
      p.facing = facing;
      p.moving = true;
      sprite.play(`${p.texture}-walk-${facing}`, true);
    }
    sprite.setPosition(p.x, p.y);
    sprite.setDepth(p.y);
  }

  /** A footstep that sounds like what the player walks on: grass, a dirt path, wooden planks or stone. */
  footstep() {
    const p = this.player;
    const tx = Math.floor(p.x / TILE);
    const ty = Math.floor((p.y - 1) / TILE);
    const w = this.world;
    let ground = 'grass';
    if (w.has(tx, ty, F.BRIDGE_H) || w.has(tx, ty, F.BRIDGE_V)) ground = 'wood';
    else if (w.has(tx, ty, F.FLOOR)) {
      const style = this.content.art.rooms?.styles?.[this.rooms.current?.room?.style];
      ground = style?.shape === 'cave' ? 'stone' : 'wood'; // a house floor is planks, a cave is rock
    }
    else if (w.has(tx, ty, F.STONES)) ground = 'stone';
    else if (w.has(tx, ty, F.SAND)) ground = 'dirt';
    this.registry.get('audio')?.play(`step-${ground}`, { volume: 0.55, vary: 0.6 });
  }

  /** On a bridge the player drifts to the middle of the planks, so the feet never hang over the rail. */
  centreOnBridge(step) {
    const p = this.player;
    const tx = Math.floor(p.x / TILE);
    const ty = Math.floor((p.y - 1) / TILE);
    if (this.world.has(tx, ty, F.BRIDGE_H)) {
      const goal = (ty + 1) * TILE - 5;
      const nudge = Math.max(-step, Math.min(step, goal - p.y));
      if (!this.blockedAt(p.x, p.y + nudge)) p.y += nudge;
    } else if (this.world.has(tx, ty, F.BRIDGE_V)) {
      const goal = (tx + 0.5) * TILE;
      const nudge = Math.max(-step, Math.min(step, goal - p.x));
      if (!this.blockedAt(p.x + nudge, p.y)) p.x += nudge;
    }
  }

  /** Remember where the player is standing, so the game carries on from here next time. */
  savePlayer() {
    const p = this.player;
    const room = this.rooms.current?.room;
    const round = (v) => Math.round(v * 10) / 10;
    this.session.change((s) => {
      s.player = { area: p.region, x: round(p.x), y: round(p.y), facing: p.facing };
      if (room) Object.assign(s.player, { room: room.id, roomX: round(p.x - room.ox * TILE), roomY: round(p.y - room.oy * TILE) });
    });
  }

  /** Stand still, facing a way. */
  faceStill(facing) {
    this.playerSprite.setFrame(8 + FACING_COLUMN[facing]);
  }

  /** Where someone shows on the map: inside a room, that is the door they went in by. */
  mapPosition(x = this.player.x, y = this.player.y) {
    return this.rooms.mapPosition(x, y);
  }

  blockedAt(x, y) {
    const x0 = Math.floor((x - FEET.halfWidth) / TILE);
    const x1 = Math.floor((x + FEET.halfWidth - 0.01) / TILE);
    const y0 = Math.floor((y - FEET.height) / TILE);
    const y1 = Math.floor((y - 0.01) / TILE);
    for (let ty = y0; ty <= y1; ty += 1) {
      for (let tx = x0; tx <= x1; tx += 1) {
        if (this.world.isBlocked(tx, ty)) return true;
      }
    }
    return false;
  }

  /** Trees and houses turn see-through while the player walks behind them. */
  updateOcclusion() {
    const p = this.player;
    const px0 = p.x - 6;
    const px1 = p.x + 6;
    const py0 = p.y - 14;
    for (const image of this.occluders) {
      const behind = p.y < image.y - 2
        && px1 > image.x - image.displayWidth / 2 && px0 < image.x + image.displayWidth / 2
        && p.y > image.y - image.displayHeight && py0 < image.y;
      image.setAlpha(behind ? 0.55 : 1);
    }
  }
}
