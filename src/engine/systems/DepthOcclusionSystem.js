/**
 * Depth and Occlusion Management System.
 * - Ground-contact depth sorting based on foot/base Y coordinate.
 * - Smooth alpha fading for tree canopies and roofs when player is behind them.
 */

export class DepthOcclusionSystem {
  constructor({ scene, player }) {
    this.scene = scene;
    this.player = player;
    this.depthEntities = new Set();
    this.occluders = [];
  }

  addDepthEntity(entity, footOffset = 0) {
    this.depthEntities.add({ entity, footOffset });
  }

  removeDepthEntity(entity) {
    for (const item of this.depthEntities) {
      if (item.entity === entity) {
        this.depthEntities.delete(item);
        break;
      }
    }
  }

  /**
   * Register an occluder (e.g., tree canopy, roof).
   * @param {Phaser.GameObjects.GameObject} sprite - The visual sprite to fade.
   * @param {Object} bounds - { x, y, width, height } upper bounding box where occlusion occurs.
   * @param {number} footY - Y coordinate of ground base for depth sorting.
   */
  registerOccluder(sprite, bounds, footY) {
    this.occluders.push({
      sprite,
      bounds,
      footY,
      currentAlpha: 1.0,
      targetAlpha: 1.0
    });
    this.addDepthEntity(sprite, footY - sprite.y);
  }

  update(delta) {
    const dt = delta / 1000;
    const fadeSpeed = 5.0; // Alpha fade lerp speed

    // 1. Foot-based depth sorting
    const playerFootY = this.player.y + 12; // Foot contact point
    this.player.setDepth(Math.floor(playerFootY));

    for (const item of this.depthEntities) {
      if (item.entity !== this.player) {
        const footY = item.entity.y + item.footOffset;
        item.entity.setDepth(Math.floor(footY));
      }
    }

    // 2. Occlusion checks & smooth transparency fade
    const px = this.player.x;
    const py = this.player.y;

    for (const occ of this.occluders) {
      const b = occ.bounds;
      const isInsideCanopy = (
        px >= b.x &&
        px <= b.x + b.width &&
        py >= b.y &&
        py <= b.y + b.height &&
        py < occ.footY // Player is behind the foot contact point
      );

      occ.targetAlpha = isInsideCanopy ? 0.45 : 1.0;

      // Smooth lerp
      if (Math.abs(occ.currentAlpha - occ.targetAlpha) > 0.01) {
        occ.currentAlpha += (occ.targetAlpha - occ.currentAlpha) * Math.min(1, dt * fadeSpeed);
        occ.sprite.setAlpha(occ.currentAlpha);
      } else {
        occ.currentAlpha = occ.targetAlpha;
        occ.sprite.setAlpha(occ.currentAlpha);
      }
    }
  }
}
