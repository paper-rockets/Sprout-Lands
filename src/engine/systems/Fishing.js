/**
 * Fishing, at a "fishing" spot in a region's interactables: { kind: "fishing", at: [x, y], cast: [x, y] }.
 * `at` is where the player stands (a pier, say) and `cast` is the water tile the bobber lands on.
 *
 *   1. Press the use button: the bobber lands in the water and floats.
 *   2. After a few seconds it gets pulled under with a splash and a "!" pops up over the player.
 *   3. Press the use button again in time to catch something (see art.json "fishing" for what).
 * Pressing too early reels in nothing; too late, and it got away. Walking off cancels it.
 */

import { TILE } from '../world/worldModel.js';

const FACING_COLUMN = { up: 0, left: 2, down: 4, right: 6 };
const between = (a, b) => a + Math.random() * (b - a);

export class Fishing {
  constructor(scene) {
    this.scene = scene;
    this.art = scene.content.art.fishing;
    this.state = 'idle'; // idle | waiting | bite
    this.spot = null;
    this.bobber = null;
    this.timer = null;
    const b = this.art.bobber;
    for (const [name, frames, rate] of [['bobber-idle', b.idle, 4], ['bobber-dunk', b.dunk, 8], ['bobber-splash', b.splash, 10]]) {
      if (!scene.anims.exists(name)) {
        scene.anims.create({ key: name, frames: scene.anims.generateFrameNumbers(b.tex, { frames }), frameRate: rate, repeat: name === 'bobber-splash' ? 0 : -1 });
      }
    }
  }

  get audio() {
    return this.scene.registry.get('audio');
  }

  /** The use button was pressed at a fishing spot. */
  use(spot) {
    if (this.state === 'idle') this.cast(spot);
    else if (this.state === 'waiting') this.reelIn('waiting');
    else if (this.state === 'bite') this.catchSomething();
  }

  cast(spot) {
    const scene = this.scene;
    const [cx, cy] = spot.def.cast;
    const world = scene.world;
    const region = spot.region;
    const wx = region.ox + cx;
    const wy = region.oy + cy;
    this.spot = spot;
    this.face(wx * TILE + TILE / 2, wy * TILE + TILE / 2);
    const b = this.art.bobber;
    this.bobber = scene.add.sprite(wx * TILE + TILE / 2, wy * TILE + TILE / 2, b.tex, b.idle[0]).setOrigin(...b.anchor).setDepth(wy * TILE + TILE).setScale(b.scale || 1);
    if (!scene.effects.reduced) this.bobber.play('bobber-idle');
    this.splash();
    this.audio?.play('cast');
    this.audio?.play('splash', { volume: 0.5, delay: 0.25, vary: 0.4 });
    this.state = 'waiting';
    this.timer = scene.time.delayedCall(between(...this.art.wait), () => this.bite());
  }

  bite() {
    if (this.state !== 'waiting') return;
    const scene = this.scene;
    this.state = 'bite';
    if (!scene.effects.reduced) this.bobber.play('bobber-dunk');
    this.splash();
    this.audio?.play('bite');
    scene.effects.emote(scene.playerSprite, 'exclaim', this.art.bite);
    this.timer = scene.time.delayedCall(this.art.bite, () => this.reelIn('late'));
  }

  /** Pull the line in with nothing on it: too early, too late, or the player walked off. */
  reelIn(why) {
    this.timer?.remove();
    const scene = this.scene;
    if (why === 'waiting' || why === 'late') scene.effects.emote(scene.playerSprite, 'question', 900);
    this.clear();
  }

  catchSomething() {
    this.timer?.remove();
    const scene = this.scene;
    const total = this.art.catches.reduce((sum, c) => sum + c.weight, 0);
    let roll = Math.random() * total;
    const caught = this.art.catches.find((c) => (roll -= c.weight) < 0) || this.art.catches[0];
    const session = scene.session;
    const p = scene.player;
    session.collect(caught.item, 1);
    scene.effects.sparkle(p.x, p.y - 20, 8);
    scene.effects.itemFloater(p.x, p.y - 26, caught.item, 1);
    if (caught.coins) {
      const coins = Math.round(between(caught.coins[0], caught.coins[1]));
      session.addCoins(coins);
      scene.effects.coinFloater(p.x + 14, p.y - 30, coins);
    }
    this.audio?.play('splash', { vary: 0.3 });
    this.audio?.play('found', { delay: 0.15 });
    this.splash();
    this.clear();
  }

  splash() {
    const scene = this.scene;
    if (!this.bobber || scene.effects.reduced) return;
    const ripple = scene.add.sprite(this.bobber.x, this.bobber.y, this.art.bobber.tex, this.art.bobber.splash[0]).setOrigin(...this.art.bobber.anchor).setDepth(this.bobber.depth + 1).setScale(this.art.bobber.scale || 1);
    ripple.play('bobber-splash');
    ripple.once('animationcomplete', () => ripple.destroy());
  }

  face(tx, ty) {
    const p = this.scene.player;
    const dx = tx - p.x;
    const dy = ty - p.y;
    p.facing = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down';
    this.scene.playerSprite.setFrame(8 + FACING_COLUMN[p.facing]);
  }

  clear() {
    this.bobber?.destroy();
    this.bobber = null;
    this.state = 'idle';
    this.spot = null;
  }

  /** Every frame: walking away from the spot puts the rod away. */
  update() {
    if (this.state === 'idle' || !this.spot) return;
    const p = this.scene.player;
    if (p.moving || Math.hypot(this.spot.x - p.x, this.spot.y - 6 - (p.y - 6)) > 32) this.reelIn('walked');
  }
}
