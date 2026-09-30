/**
 * Wandering animals: hens, chicks, cows and calves. Each one idles, strolls to a
 * nearby spot, and does small things (pecks, grazes, naps) in between. They never
 * walk into water, fences, trees or houses, because they check the same
 * "where can anyone stand" grid the player uses.
 *
 * Chicks can `follow` a leader (their mother hen) and trot after her.
 * Some art.json creatures have extra looks: "feet" (the pixel row of the feet in a frame, when the
 * picture has empty space below them, like the slime), and "fly" (how many pixels above the ground
 * it flies, like a bat: it bobs gently up and down and has a small shadow on the floor).
 * A creature with a `guide` (a function giving a spot to stand on) walks straight to
 * that spot instead of wandering: that is how lost chicks trail behind the player.
 */

import { TILE } from '../world/worldModel.js';

const between = (a, b) => a + Math.random() * (b - a);
const pick = (list) => list[Math.floor(Math.random() * list.length)];

/**
 * Frame numbers for one animation: a row of a sheet, `count` frames long (from column `start`, 0 if not given),
 * or the columns listed in `frames` (a short sheet whose frames are reused in different orders, like the crow).
 */
export function rowFrames(spec, anim) {
  if (anim.frames) return anim.frames.map((col) => anim.row * spec.cols + col);
  return Array.from({ length: anim.count }, (_, i) => anim.row * spec.cols + (anim.start || 0) + i);
}

/** Create Phaser animations named "<texture>:<animation>" for every creature in art.json. */
export function createCreatureAnimations(scene, art) {
  for (const spec of Object.values(art.creatures || {})) {
    if (!spec.textures) continue;
    for (const tex of spec.textures) {
      if (!scene.textures.exists(tex)) continue;
      for (const [name, anim] of Object.entries(spec.anims)) {
        const key = `${tex}:${name}`;
        if (scene.anims.exists(key)) continue;
        scene.anims.create({
          key,
          frames: scene.anims.generateFrameNumbers(tex, { frames: rowFrames(spec, anim) }),
          frameRate: anim.fps,
          repeat: anim.repeat ?? -1
        });
      }
    }
  }
}

/** Can something stand with its feet at pixel (x, y)? */
function canStand(world, x, y) {
  return !world.isBlocked(Math.floor(x / TILE), Math.floor((y - 1) / TILE));
}

/** Is the straight way from one spot to another free of anything solid? */
function pathClear(world, x0, y0, x1, y1) {
  const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 4));
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    if (!canStand(world, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false;
  }
  return true;
}

export class Creature {
  /**
   * @param scene   the Phaser scene
   * @param world   the world grid (for "can I go there")
   * @param kind    'hen', 'cow', ... a key of art.json creatures
   * @param spec    art.json creatures[kind]
   * @param color   which picture set (index into spec.textures)
   * @param x, y    where its feet start, in pixels
   * @param options { radius (tiles), follow (leader creature), speed }
   */
  constructor(scene, world, kind, spec, color, x, y, options = {}) {
    this.scene = scene;
    this.world = world;
    this.kind = kind;
    this.spec = spec;
    this.tex = spec.textures[Math.min(color || 0, spec.textures.length - 1)];
    this.homeX = x;
    this.homeY = y;
    this.x = x;
    this.y = y;
    this.radius = (options.radius ?? spec.radius ?? 3) * TILE;
    this.leader = options.leader || null;
    this.speed = options.speed ?? spec.speed;
    this.sprite = scene.add.sprite(x, y, this.tex, 0).setOrigin(0.5, 1).setDepth(y);
    if (spec.feet) this.sprite.setOrigin(0.5, spec.feet / this.sprite.height);
    this.fly = spec.fly || 0;
    this.bobTime = between(0, Math.PI * 2);
    this.shadow = this.fly ? scene.add.ellipse(x, y - 1, 10, 4, 0x000000, 0.22).setDepth(y - 0.5) : null;
    this.draw();
    this.state = 'idle';
    this.timer = between(0.2, 3);
    this.paused = false;
    this.anim = null;
    this.play('idle');
  }

  play(name) {
    const key = `${this.tex}:${name}`;
    if (this.anim === key) return;
    this.anim = key;
    this.sprite.play(key, true);
  }

  /** Turn to face a point (used when the player talks to it). */
  faceTowards(x) {
    this.sprite.setFlipX(x < this.x);
  }

  /** Enjoy being petted: the "love" animation if this animal has one, or a happy hop. */
  love(seconds = 1.6) {
    this.paused = false;
    this.state = 'act';
    this.timer = seconds;
    if (this.spec.anims.love) this.play('love');
    else this.scene.effects.hop(this.sprite, 4);
  }

  /** Stand still (true) or carry on (false). */
  pause(paused) {
    this.paused = paused;
    if (paused) this.play('idle');
  }

  /** Put the picture (and a flyer's shadow) where the creature is. */
  draw() {
    let lift = this.fly;
    if (this.fly && !this.scene.session?.settings.reducedMotion) lift += Math.sin(this.bobTime) * 2.5;
    this.sprite.setPosition(this.x, this.y - lift).setDepth(this.y);
    this.shadow?.setPosition(this.x, this.y - 1).setDepth(this.y - 0.5);
  }

  update(dt) {
    if (this.fly) {
      // Flyers bob up and down all the time, even while resting.
      this.bobTime += dt * 3;
      this.draw();
    }
    if (this.paused) return;
    if (this.guide) {
      this.followGuide(dt);
      return;
    }
    switch (this.state) {
      case 'idle':
        this.timer -= dt;
        if (this.timer <= 0) this.decide();
        break;
      case 'walk':
        this.walk(dt);
        break;
      default: // an "act": peck, graze, sleep...
        this.timer -= dt;
        if (this.timer <= 0) {
          this.state = 'idle';
          this.timer = between(0.8, 2.6);
          this.play('idle');
        }
    }
  }

  /** Walk to the spot the guide gives (a point on the path the player walked, so it is always free). */
  followGuide(dt) {
    const target = this.guide();
    const dx = target ? target.x - this.x : 0;
    const dy = target ? target.y - this.y : 0;
    const distance = Math.hypot(dx, dy);
    if (distance < 1.5) {
      this.play('idle');
      return;
    }
    const speed = distance > 40 ? 130 : 80;
    const step = Math.min(distance, speed * dt);
    this.x += (dx / distance) * step;
    this.y += (dy / distance) * step;
    if (Math.abs(dx) > 0.5) this.sprite.setFlipX(dx < 0);
    this.play('walk');
    this.draw();
  }

  /** Stop following the guide and settle down with a new leader (a chick brought home to its mother). */
  settleWith(leader, teleport = false) {
    this.guide = null;
    this.leader = leader;
    if (leader && teleport) {
      this.x = leader.x + between(-8, 8);
      this.y = leader.y + between(2, 6);
      this.draw();
    }
    this.radius = 2 * TILE;
    this.state = 'idle';
    this.timer = between(0.5, 2);
    this.play('idle');
  }

  /** Choose what to do next. */
  decide() {
    // Followers trot after their leader whenever it has wandered off.
    if (this.leader) {
      const far = Math.hypot(this.leader.x - this.x, this.leader.y - this.y);
      if (far > 22 && this.goNear(this.leader.x, this.leader.y, 10)) return;
    }
    const roll = Math.random();
    const acts = this.spec.acts || [];
    if (roll < 0.5 && this.speed > 0 && this.goSomewhere()) return;
    if (roll < 0.85 && acts.length) {
      const act = pick(acts);
      const anim = this.spec.anims[act];
      const loops = between(1, 3);
      this.state = 'act';
      this.timer = anim ? (anim.count / anim.fps) * loops : 1.5;
      this.play(act);
      return;
    }
    this.timer = between(1, 3.5);
  }

  /** Start walking to a random spot near home (or near the leader). */
  goSomewhere() {
    const cx = this.leader ? this.leader.x : this.homeX;
    const cy = this.leader ? this.leader.y : this.homeY;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const angle = between(0, Math.PI * 2);
      const distance = between(10, this.radius);
      const tx = cx + Math.cos(angle) * distance;
      const ty = cy + Math.sin(angle) * distance;
      if (this.startWalk(tx, ty)) return true;
    }
    return false;
  }

  /** Start walking to a spot within `spread` pixels of (x, y). */
  goNear(x, y, spread) {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      if (this.startWalk(x + between(-spread, spread), y + between(-spread * 0.5, spread * 0.5))) return true;
    }
    return false;
  }

  startWalk(tx, ty) {
    if (!canStand(this.world, tx, ty) || !pathClear(this.world, this.x, this.y, tx, ty)) return false;
    this.targetX = tx;
    this.targetY = ty;
    this.state = 'walk';
    this.play('walk');
    return true;
  }

  walk(dt) {
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const distance = Math.hypot(dx, dy);
    const step = this.speed * (this.leader && distance > 30 ? 1.5 : 1) * dt;
    if (distance <= step) {
      this.x = this.targetX;
      this.y = this.targetY;
      this.arrive();
    } else {
      const nx = this.x + (dx / distance) * step;
      const ny = this.y + (dy / distance) * step;
      if (!canStand(this.world, nx, ny)) {
        this.arrive();
        return;
      }
      this.x = nx;
      this.y = ny;
      if (Math.abs(dx) > 0.5) this.sprite.setFlipX(dx < 0);
    }
    this.draw();
  }

  arrive() {
    this.state = 'idle';
    this.timer = between(0.6, 2.5);
    this.play('idle');
    this.draw();
  }

  destroy() {
    this.sprite.destroy();
    this.shadow?.destroy();
  }
}

export class CreatureManager {
  constructor(scene, world, art) {
    this.scene = scene;
    this.world = world;
    this.art = art;
    this.creatures = [];
    this.byId = new Map();
    createCreatureAnimations(scene, art);
  }

  /** Add an animal described by a region file entry: { kind, color, at, radius, follow, id }. */
  add(region, def) {
    const spec = this.art.creatures[def.kind];
    if (!spec) throw new Error(`${region.id}: there is no animal called "${def.kind}" in art.json creatures`);
    const x = (region.ox + def.at[0]) * TILE + TILE / 2;
    const y = (region.oy + def.at[1] + 1) * TILE - 1;
    const leader = def.follow ? this.byId.get(def.follow) : null;
    if (def.follow && !leader) throw new Error(`${region.id}: "${def.kind}" follows "${def.follow}", which is not listed before it`);
    const creature = new Creature(this.scene, this.world, def.kind, spec, def.color, x, y, { radius: def.radius, leader, speed: def.speed });
    creature.id = def.id || `${region.id}:critter:${this.creatures.length}`;
    creature.isNpc = Boolean(def.id);
    this.creatures.push(creature);
    if (def.id) this.byId.set(def.id, creature);
    return creature;
  }

  update(deltaMs) {
    const dt = Math.min(deltaMs, 100) / 1000;
    for (const c of this.creatures) c.update(dt);
  }
}
