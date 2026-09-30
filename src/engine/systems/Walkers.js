/**
 * People (character sheets, like the Little Imp) who can walk behind the player and
 * then walk home. They answer to the same calls as a wandering animal (Creatures.js):
 * `guide` (a function giving the spot to walk to), pause, faceTowards and settleWith,
 * so the quest code treats a lost friend and a lost chick the same way.
 *
 * Character sheets: 8 columns (back, back-left, left, front-left, front, front-right,
 * right, back-right) and rows left step / standing / right step.
 */

const COLUMN = { up: 0, 'up-left': 1, left: 2, 'down-left': 3, down: 4, 'down-right': 5, right: 6, 'up-right': 7 };
const SECTOR = { 0: 'right', 1: 'down-right', 2: 'down', 3: 'down-left', 4: 'left', '-4': 'left', '-3': 'up-left', '-2': 'up', '-1': 'up-right' };

export class CharacterWalker {
  constructor(scene, sprite, texture, facing = 'down') {
    this.scene = scene;
    this.sprite = sprite;
    this.texture = texture;
    this.facing = facing;
    this.x = sprite.x;
    this.y = sprite.y;
    this.guide = null;
    this.target = null; // a one-off spot to walk to (going home)
    this.leader = null;
    this.paused = false;
    this.walking = false;
  }

  stand() {
    this.walking = false;
    this.sprite.stop();
    this.sprite.setFrame(8 + COLUMN[this.facing]);
  }

  faceTowards(x, y = this.y) {
    const sector = Math.round(Math.atan2(y - this.y, x - this.x) / (Math.PI / 4));
    this.facing = SECTOR[sector] || this.facing;
    this.stand();
  }

  pause(paused) {
    this.paused = paused;
    if (paused) this.stand();
  }

  /** Stop following and go to stand beside `leader` (a sprite or creature), facing it. */
  settleWith(leader, teleport = false) {
    this.guide = null;
    this.leader = leader;
    if (!leader) {
      this.stand();
      return;
    }
    const spot = { x: leader.x + 16, y: leader.y + 2 };
    if (teleport) {
      this.x = spot.x;
      this.y = spot.y;
      this.sprite.setPosition(this.x, this.y).setDepth(this.y);
      this.faceTowards(leader.x, leader.y);
    } else {
      this.target = spot;
    }
  }

  update(dt) {
    if (this.paused) return;
    const target = this.guide ? this.guide() : this.target;
    if (!target) {
      if (this.walking) this.stand();
      return;
    }
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 1.5) {
      if (this.target === target) {
        this.target = null;
        if (this.leader) this.faceTowards(this.leader.x, this.leader.y);
      }
      if (this.walking) this.stand();
      return;
    }
    const step = Math.min(distance, (distance > 40 ? 130 : 72) * dt);
    this.x += (dx / distance) * step;
    this.y += (dy / distance) * step;
    const facing = SECTOR[Math.round(Math.atan2(dy, dx) / (Math.PI / 4))] || this.facing;
    if (!this.walking || facing !== this.facing) {
      this.facing = facing;
      this.walking = true;
      this.sprite.play(`${this.texture}-walk-${facing}`, true);
    }
    this.sprite.setPosition(this.x, this.y).setDepth(this.y);
  }
}
