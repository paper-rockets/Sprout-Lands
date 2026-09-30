/**
 * Little things that make the world feel alive but that you cannot talk to:
 * bees circling flowers, frogs on lily pads, fish in the water, a boat bobbing
 * at the dock, and a crackling campfire. Each is listed in a region file under
 * "life", for example { "type": "bee", "at": [15, 12], "radius": 2 }.
 */

import { TILE } from '../world/worldModel.js';

const between = (a, b) => a + Math.random() * (b - a);

// Fish live between the water (depth -1000) and the ground tiles (depth -900).
const FISH_DEPTH = -950;
const FLAT_DEPTH = -500;

export class Life {
  constructor(scene, art) {
    this.scene = scene;
    this.art = art;
    this.bees = [];
    this.frogs = [];
    this.glows = [];
  }

  /** Add one thing described by a region file entry. */
  add(region, def) {
    const cx = (region.ox + def.at[0]) * TILE + TILE / 2;
    const bottom = (region.oy + def.at[1] + 1) * TILE;
    switch (def.type) {
      case 'bee':
        return this.addBee(cx, bottom - TILE / 2, def);
      case 'frog':
        return this.addFrog(cx, bottom - 3, def);
      case 'fish':
        return this.addFish(cx, bottom, def);
      case 'boat':
        return this.addBoat(cx, bottom, def);
      case 'fire':
        return this.addFire(cx, bottom, def);
      default:
        throw new Error(`${region.id}: there is no kind of life called "${def.type}"`);
    }
  }

  addBee(cx, cy, def) {
    const scene = this.scene;
    const sprite = scene.add.sprite(cx, cy, 'animal-bee', 0).play('bee-fly');
    sprite.anims.setProgress(Math.random());
    const shadow = scene.add.ellipse(cx, cy, 6, 2, 0x000000, 0.22).setDepth(FLAT_DEPTH + 1);
    const radius = (def.radius ?? 2) * TILE;
    this.bees.push({ sprite, shadow, cx, cy, rx: radius, ry: radius * 0.55, a: between(0.7, 1.2), b: between(0.9, 1.5), phase: between(0, Math.PI * 2), t: 0, lastX: cx });
  }

  addFrog(x, y, def) {
    const spec = this.art.creatures.frog;
    const tex = spec.textures[Math.min(def.color || 0, spec.textures.length - 1)];
    const sprite = this.scene.add.sprite(x, y, tex, 0).setOrigin(0.5, 1).setDepth(y + 1);
    sprite.play(`${tex}:idle`);
    const frog = { sprite, tex, timer: between(1.5, 5) };
    this.frogs.push(frog);
  }

  addFish(x, y, def) {
    const size = def.size || 'small';
    const tex = `animal-fish-${size}`;
    const sprite = this.scene.add.sprite(x, y - TILE / 2, tex, 0).setDepth(FISH_DEPTH).setAlpha(size === 'big' ? 0.5 : 0.6);
    sprite.play(`${tex}:idle`);
    sprite.anims.setProgress(Math.random());
    if (def.flip) sprite.setFlipX(true);
  }

  addBoat(x, y) {
    const sprite = this.scene.add.sprite(x, y, 'obj-boats', 3).setOrigin(0.5, 1).setDepth(FLAT_DEPTH + y / 1000);
    sprite.play('boat-bob');
    sprite.anims.setProgress(Math.random());
  }

  addFire(x, y) {
    const scene = this.scene;
    const glow = scene.add.circle(x, y - 6, 26, 0xffa64d, 0.16).setDepth(FLAT_DEPTH + 2);
    const flame = scene.add.sprite(x, y - 4, 'obj-fire', 0).setOrigin(0.5, 1).setDepth(y + 1);
    flame.play('fire-burn');
    flame.anims.setProgress(Math.random());
    this.glows.push({ glow, t: Math.random() * 6 });
  }

  update(deltaMs) {
    const dt = Math.min(deltaMs, 100) / 1000;
    for (const bee of this.bees) {
      bee.t += dt;
      const x = bee.cx + Math.cos(bee.a * bee.t + bee.phase) * bee.rx;
      const y = bee.cy + Math.sin(bee.b * bee.t + bee.phase) * bee.ry;
      const bob = Math.sin(bee.t * 9) * 1.2;
      bee.sprite.setPosition(x, y - 12 + bob).setDepth(y + 300);
      bee.shadow.setPosition(x, y + 3);
      if (Math.abs(x - bee.lastX) > 0.05) bee.sprite.setFlipX(x < bee.lastX);
      bee.lastX = x;
    }
    for (const frog of this.frogs) {
      frog.timer -= dt;
      if (frog.timer > 0) continue;
      const move = Math.random() < 0.5 ? 'tongue' : 'hop';
      frog.sprite.play(`${frog.tex}:${move}`);
      frog.sprite.once('animationcomplete', () => frog.sprite.play(`${frog.tex}:idle`));
      frog.timer = between(3, 8);
      // A frog close to the player sometimes says ribbit (quietly, and not every time).
      const player = this.scene.player;
      if (player && Math.random() < 0.35 && Math.hypot(frog.sprite.x - player.x, frog.sprite.y - player.y) < 110) {
        this.scene.registry.get('audio')?.play('ribbit', { volume: 0.45, vary: 0.5 });
      }
    }
    for (const g of this.glows) {
      g.t += dt;
      g.glow.setAlpha(0.13 + Math.sin(g.t * 7) * 0.03 + Math.sin(g.t * 3.1) * 0.02);
    }
  }
}
