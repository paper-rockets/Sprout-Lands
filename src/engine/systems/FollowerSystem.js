/**
 * FollowerSystem: Breadcrumb trail for smooth, trailing followers (e.g. ducklings, rescued friends).
 * - Records player history and positions each follower smoothly behind the predecessor.
 * - Supports adding/removing followers, area transitions, and walk/idle animation syncing.
 */

export class FollowerSystem {
  constructor({ scene, player, spacing = 22, maxHistory = 300 }) {
    this.scene = scene;
    this.player = player;
    this.spacing = spacing; // Distance between each member in line
    this.maxHistory = maxHistory;

    this.history = []; // [{ x, y }]
    this.followers = []; // [{ id, sprite, name, animKeyPrefix }]
  }

  addFollower({ id, name, sprite, animKeyPrefix = null }) {
    // Avoid duplicate followers
    if (this.followers.some(f => f.id === id)) return;

    this.followers.push({ id, name, sprite, animKeyPrefix });
  }

  removeFollower(id) {
    const idx = this.followers.findIndex(f => f.id === id);
    if (idx !== -1) {
      const removed = this.followers.splice(idx, 1)[0];
      if (removed.sprite && removed.sprite.destroy) {
        removed.sprite.destroy();
      }
      return removed;
    }
    return null;
  }

  clearFollowers() {
    for (const f of this.followers) {
      if (f.sprite && f.sprite.destroy) {
        f.sprite.destroy();
      }
    }
    this.followers = [];
    this.history = [];
  }

  getFollowerCount() {
    return this.followers.length;
  }

  /**
   * Called every frame from Scene.update.
   */
  update(delta) {
    if (!this.player) return;

    const px = this.player.x;
    const py = this.player.y;

    // Record position when moved at least 3px from last recorded point
    if (this.history.length === 0) {
      this.history.unshift({ x: px, y: py });
    } else {
      const last = this.history[0];
      const dist = Math.hypot(px - last.x, py - last.y);
      if (dist >= 3) {
        this.history.unshift({ x: px, y: py });
        if (this.history.length > this.maxHistory) {
          this.history.pop();
        }
      }
    }

    if (this.followers.length === 0) return;

    // Position each follower along the breadcrumb path
    for (let i = 0; i < this.followers.length; i++) {
      const follower = this.followers[i];
      const targetDistance = (i + 1) * this.spacing;

      const targetPos = this.getPositionAlongHistory(targetDistance);
      if (targetPos) {
        const dx = targetPos.x - follower.sprite.x;
        const dy = targetPos.y - follower.sprite.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 2) {
          // Smooth lerp toward breadcrumb target
          const lerpRate = Math.min(1, (delta / 1000) * 10);
          follower.sprite.x += dx * lerpRate;
          follower.sprite.y += dy * lerpRate;

          // Update depth sorting
          follower.sprite.setDepth(Math.floor(follower.sprite.y + 8));

          // Set walking animation if available
          if (follower.animKeyPrefix && dist > 4) {
            const facing = this.getFacing(dx, dy);
            const anim = `${follower.animKeyPrefix}-${facing}`;
            if (this.scene.anims.exists(anim) && follower.sprite.anims.currentAnim?.key !== anim) {
              follower.sprite.play(anim, true);
            }
          }
        } else {
          // Idle frame when follower stops
          if (follower.sprite.anims) {
            follower.sprite.anims.stop();
          }
        }
      }
    }
  }

  getPositionAlongHistory(desiredDistance) {
    if (this.history.length === 0) return null;
    if (this.history.length === 1) return this.history[0];

    let accumulated = 0;
    for (let i = 0; i < this.history.length - 1; i++) {
      const p1 = this.history[i];
      const p2 = this.history[i + 1];
      const segmentDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);

      if (accumulated + segmentDist >= desiredDistance) {
        const remain = desiredDistance - accumulated;
        const ratio = segmentDist > 0 ? remain / segmentDist : 0;
        return {
          x: p1.x + (p2.x - p1.x) * ratio,
          y: p1.y + (p2.y - p1.y) * ratio
        };
      }
      accumulated += segmentDist;
    }

    // If history isn't long enough yet, return the oldest point
    return this.history[this.history.length - 1];
  }

  getFacing(dx, dy) {
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'right' : 'left';
    }
    return dy > 0 ? 'down' : 'up';
  }

  /**
   * Reset trail when transitioning between maps so followers don't stretch across screens.
   */
  snapToPlayer(px, py) {
    this.history = [{ x: px, y: py }];
    for (let i = 0; i < this.followers.length; i++) {
      const f = this.followers[i];
      f.sprite.setPosition(px - (i + 1) * 16, py);
    }
  }
}
