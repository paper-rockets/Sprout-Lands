/**
 * Fence gates, listed in a region's "gates": [{ "at": [x, y] }].
 * Put a gate on the gap in a fence line that runs left to right. It stays shut (and solid)
 * until the player gets close, then swings open; it closes again a moment after they walk away,
 * but never while somebody is standing in the doorway.
 *
 * House doors work the same way (art.json "doors"): every house whose picture sheet is listed there
 * gets a wooden door drawn over its open doorway, which swings open as the player walks up to it.
 * Doors are only a picture: the doorway tile is walkable either way.
 */

import { TILE } from '../world/worldModel.js';

export class Gates {
  constructor(scene) {
    this.scene = scene;
    this.art = scene.content.art.gates;
    this.list = [];
    this.doors = [];
    this.openDoors = [];
    this.playing = false;
  }

  addRegion(region) {
    for (const def of region.gates || []) this.add(region, def);
    this.addOpenDoors(region);
    const doorArt = this.scene.content.art.doors;
    if (!doorArt) return;
    const defs = this.scene.content.art.objects;
    for (const obj of region.objects || []) {
      const def = defs[obj.type];
      const at = def?.door && doorArt.houses[def.tex];
      const house = at && this.scene.objectSprites.get(`${region.id}:${obj.at[0]},${obj.at[1]}`);
      if (house) this.addDoor(house, at, doorArt);
    }
  }

  /** Houses painted with a shut door can list art.json "openDoor": a picture of the open doorway that fades in over it. */
  addOpenDoors(region) {
    const defs = this.scene.content.art.objects;
    for (const obj of region.objects || []) {
      const open = defs[obj.type]?.openDoor;
      const house = open && this.scene.objectSprites.get(`${region.id}:${obj.at[0]},${obj.at[1]}`);
      if (!house) continue;
      const [rx, ry, rw, rh] = open.rect;
      const tex = this.scene.textures.get(open.tex);
      const name = `${open.tex}:${rx},${ry}`;
      if (!tex.has(name)) tex.add(name, 0, rx, ry, rw, rh);
      const left = house.x - house.displayWidth * house.originX + open.at[0];
      const top = house.y - house.displayHeight * house.originY + open.at[1];
      const sprite = this.scene.add.sprite(left, top, open.tex, name).setOrigin(0, 0).setDepth(house.depth + 0.01).setAlpha(0);
      this.openDoors.push({ sprite, house, x: left + rw / 2, y: top + rh, lit: 0, since: 0 });
    }
  }

  /** Fade each open doorway in while the player is near, and out a moment after they leave. */
  updateOpenDoors(delta) {
    const art = this.scene.content.art.doors;
    const range = art?.range ?? 26;
    const closeAfter = (art?.closeAfter ?? 1.2) * 1000;
    const player = this.scene.player;
    const now = this.scene.time.now;
    for (const door of this.openDoors) {
      const near = Math.hypot(door.x - player.x, door.y - (player.y - 4)) < range;
      if (near) door.since = now;
      const want = near || now - door.since < closeAfter ? 1 : 0;
      const speed = this.scene.effects.reduced ? 1 : delta / 180;
      door.lit = want > door.lit ? Math.min(1, door.lit + speed) : Math.max(0, door.lit - speed);
      door.sprite.setAlpha(door.lit * door.house.alpha);
    }
  }

  /** A door picture over a house's doorway; `at` = where it sits from the house picture's top-left corner. */
  addDoor(house, at, doorArt) {
    const left = house.x - house.displayWidth * house.originX + at[0];
    const top = house.y - house.displayHeight * house.originY + at[1];
    const sprite = this.scene.add.sprite(left, top, doorArt.tex, doorArt.closed).setOrigin(0, 0).setDepth(house.depth + 0.01);
    // The door picture's middle bottom, where the player walks in.
    this.doors.push({ sprite, house, x: left + 31, y: top + 44, since: 0, state: 'closed' });
  }

  play(door, frames, state, done) {
    const art = this.scene.content.art.doors;
    door.state = state;
    if (this.scene.effects.reduced) {
      door.sprite.setFrame(frames[frames.length - 1]);
      door.state = done;
      return;
    }
    const step = 1000 / art.fps;
    frames.forEach((frame, i) => this.scene.time.delayedCall(step * i, () => door.sprite.setFrame(frame)));
    this.scene.time.delayedCall(step * frames.length, () => { door.state = done; });
  }

  updateDoors() {
    const art = this.scene.content.art.doors;
    const player = this.scene.player;
    const now = this.scene.time.now;
    for (const door of this.doors) {
      door.sprite.setAlpha(door.house.alpha); // see-through with its house when the player is behind it
      const near = Math.hypot(door.x - player.x, door.y - (player.y - 4)) < art.range;
      if (near) door.since = now;
      if (near && door.state === 'closed') {
        this.play(door, art.opening, 'opening', 'open');
        this.scene.registry.get('audio')?.play('door-open', { volume: 0.6, vary: 0.4 });
      } else if (!near && door.state === 'open' && now - door.since > art.closeAfter * 1000) {
        this.play(door, art.closing, 'closing', 'closed');
        this.scene.registry.get('audio')?.play('door-close', { volume: 0.5, delay: 0.2 });
      }
    }
  }

  add(region, def) {
    const world = this.scene.world;
    const x = region.ox + def.at[0];
    const y = region.oy + def.at[1];
    if (!world.has(x, y, 0xffff) && !world.inBounds(x, y)) throw new Error(`${region.id}: gate at ${def.at} is outside the map`);
    const sprite = this.scene.add.sprite(x * TILE + TILE / 2, (y + 1) * TILE, this.art.tex, this.art.closed).setOrigin(0.5, 1).setDepth((y + 1) * TILE);
    const gate = { x: sprite.x, y: y * TILE + TILE / 2, tx: x, ty: y, sprite, open: false, since: 0, state: 'closed' };
    world.blocked[world.idx(x, y)] = 1; // shut gates are solid
    this.list.push(gate);
  }

  setSolid(gate, solid) {
    const world = this.scene.world;
    world.blocked[world.idx(gate.tx, gate.ty)] = solid ? 1 : 0;
  }

  swing(gate, opening) {
    const frames = opening ? this.art.opening : [...this.art.opening].reverse();
    const scene = this.scene;
    const step = 1000 / this.art.fps;
    gate.state = opening ? 'opening' : 'closing';
    if (scene.effects.reduced) {
      gate.sprite.setFrame(frames[frames.length - 1]);
      this.finish(gate, opening);
      return;
    }
    frames.forEach((frame, i) => {
      scene.time.delayedCall(step * i, () => gate.sprite.setFrame(frame));
    });
    scene.time.delayedCall(step * frames.length, () => this.finish(gate, opening));
  }

  finish(gate, opening) {
    gate.state = opening ? 'open' : 'closed';
    if (opening) this.setSolid(gate, false);
  }

  update(time, delta) {
    if (this.doors.length) this.updateDoors();
    if (this.openDoors.length) this.updateOpenDoors(delta ?? 16);
    const player = this.scene.player;
    const now = this.scene.time.now;
    for (const gate of this.list) {
      const near = Math.hypot(gate.x - player.x, gate.y - (player.y - 4)) < this.art.range;
      if (near) gate.since = now;
      if (near && gate.state === 'closed') {
        this.swing(gate, true);
        this.scene.registry.get('audio')?.play('gate-open', { volume: 0.6, vary: 0.5 });
      } else if (!near && gate.state === 'open' && now - gate.since > this.art.closeAfter * 1000) {
        // Never shut it on somebody standing in the doorway.
        if (Math.abs(player.x - gate.x) < 10 && Math.abs(player.y - gate.y) < 12) continue;
        this.setSolid(gate, true);
        this.swing(gate, false);
        this.scene.registry.get('audio')?.play('gate-close', { volume: 0.5, delay: 0.15 });
      }
    }
  }
}
