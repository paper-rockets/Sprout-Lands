/**
 * PlayerController: Unified input handling, movement, and 8-direction animations.
 * Supports:
 * - Keyboard (WASD & Arrow Keys) with collision sliding
 * - Tap/Click to move via A* pathfinding
 * - Hold-to-steer for continuous touch/mouse movement
 * - Facing direction tracking and idle frames
 */

export class PlayerController {
  constructor({ scene, sprite, navigationService, session, speed = 110, characterKey = 'capybara_natural', audioService }) {
    this.scene = scene;
    this.sprite = sprite;
    this.nav = navigationService;
    this.session = session;
    this.speed = speed; // Pixels per second
    this.characterKey = characterKey;
    this.audioService = audioService;

    // Movement state
    this.isMoving = false;
    this.facing = 'down'; // 'down', 'up', 'left', 'right', 'down-right', etc.
    this.facingCol = 4; // Default Down column index (0..7)

    // Waypoints for click-to-move
    this.waypoints = [];
    this.currentWaypoint = null;

    // Hold-to-steer pointer state
    this.pointerDownTime = 0;
    this.isPointerSteering = false;

    // Last broadcast position
    this.lastSentX = sprite.x;
    this.lastSentY = sprite.y;
    this.moveBroadcastTimer = 0;

    this.setupInput();
  }

  setupInput() {
    // 1. Keyboard
    this.cursors = this.scene.input.keyboard.createCursorKeys();
    this.wasd = this.scene.input.keyboard.addKeys({
      up: 'W',
      down: 'S',
      left: 'A',
      right: 'D'
    });

    // 2. Pointer (Mouse / Touch)
    this.scene.input.on('pointerdown', (pointer) => {
      // Ignore if clicking UI buttons at top
      if (pointer.y < 80 && (pointer.x < 320 || pointer.x > this.scene.scale.width - 200)) return;

      this.pointerDownTime = this.scene.time.now;
      this.isPointerSteering = false;
    });

    this.scene.input.on('pointerup', (pointer) => {
      const duration = this.scene.time.now - this.pointerDownTime;
      this.isPointerSteering = false;

      // Ignore if clicking UI
      if (pointer.y < 80 && (pointer.x < 320 || pointer.x > this.scene.scale.width - 200)) return;

      // Short tap: pathfind to clicked location
      if (duration < 250) {
        this.navigateTo(pointer.worldX, pointer.worldY);
      }
    });
  }

  setCharacterKey(newKey) {
    this.characterKey = newKey;
    this.updateAnimation(0, 0);
  }

  navigateTo(worldX, worldY) {
    if (!this.nav) return;
    const path = this.nav.findPath(this.sprite.x, this.sprite.y, worldX, worldY);
    if (path && path.length > 0) {
      // Remove first waypoint if already very close
      if (path.length > 1 && Math.hypot(path[0].x - this.sprite.x, path[0].y - this.sprite.y) < 8) {
        path.shift();
      }
      this.waypoints = path;
      this.currentWaypoint = this.waypoints.shift();
    }
  }

  stopNavigation() {
    this.waypoints = [];
    this.currentWaypoint = null;
  }

  /**
   * Main update loop called every frame from Scene.update(time, delta).
   */
  update(time, delta) {
    const dt = delta / 1000;
    const pointer = this.scene.input.activePointer;

    let moveX = 0;
    let moveY = 0;

    // Check hold-to-steer
    if (pointer.isDown && (time - this.pointerDownTime) >= 250) {
      if (!(pointer.y < 80 && (pointer.x < 320 || pointer.x > this.scene.scale.width - 200))) {
        this.isPointerSteering = true;
        this.stopNavigation();

        const dx = pointer.worldX - this.sprite.x;
        const dy = pointer.worldY - this.sprite.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 12) {
          moveX = dx / dist;
          moveY = dy / dist;
        }
      }
    }

    // Keyboard overrides hold-to-steer and waypoints
    let keyX = 0;
    let keyY = 0;
    if (this.cursors.left.isDown || this.wasd.left.isDown) keyX -= 1;
    if (this.cursors.right.isDown || this.wasd.right.isDown) keyX += 1;
    if (this.cursors.up.isDown || this.wasd.up.isDown) keyY -= 1;
    if (this.cursors.down.isDown || this.wasd.down.isDown) keyY += 1;

    if (keyX !== 0 || keyY !== 0) {
      this.stopNavigation();
      const len = Math.hypot(keyX, keyY);
      moveX = keyX / len;
      moveY = keyY / len;
    }

    // Waypoint navigation if no manual keyboard/steer input
    if (moveX === 0 && moveY === 0 && this.currentWaypoint) {
      const dx = this.currentWaypoint.x - this.sprite.x;
      const dy = this.currentWaypoint.y - this.sprite.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 4) {
        if (this.waypoints.length > 0) {
          this.currentWaypoint = this.waypoints.shift();
        } else {
          this.currentWaypoint = null;
        }
      } else {
        moveX = dx / dist;
        moveY = dy / dist;
      }
    }

    // Apply movement with collision sliding
    if (moveX !== 0 || moveY !== 0) {
      this.isMoving = true;
      const stepDist = this.speed * dt;
      const desiredVx = moveX * stepDist;
      const desiredVy = moveY * stepDist;

      // Collision slide
      const slide = this.nav.computeSlideVector(this.sprite.x, this.sprite.y, desiredVx, desiredVy, 6);
      this.sprite.x += slide.vx;
      this.sprite.y += slide.vy;

      this.updateFacing(moveX, moveY);
      this.updateAnimation(slide.vx, slide.vy);

      // Debounce session position updates
      this.moveBroadcastTimer += delta;
      if (this.moveBroadcastTimer >= 200) {
        this.moveBroadcastTimer = 0;
        if (Math.hypot(this.sprite.x - this.lastSentX, this.sprite.y - this.lastSentY) >= 4) {
          this.lastSentX = this.sprite.x;
          this.lastSentY = this.sprite.y;
          this.session?.dispatchAction('PLAYER_MOVE', { x: this.sprite.x, y: this.sprite.y });
        }
      }
    } else {
      if (this.isMoving) {
        this.isMoving = false;
        this.setIdleFrame();
      }
    }
  }

  /**
   * Determine 8-direction facing based on normalized (vx, vy).
   */
  updateFacing(vx, vy) {
    const angle = Math.atan2(vy, vx) * (180 / Math.PI); // -180 to 180

    // Column mapping in 128x48 8-direction sheets:
    // Frame numbers: col + row * 8
    // Columns: 0: Down-Right, 1: Right, 2: Up-Right, 3: Up, 4: Down, 5: Up-Left, 6: Left, 7: Down-Left
    // Sprout Lands 8-dir order:
    // 0: Right, 1: Down-Right, 2: Down, 3: Down-Left, 4: Left, 5: Up-Left, 6: Up, 7: Up-Right (or standard)
    if (angle >= -22.5 && angle < 22.5) {
      this.facing = 'right';
      this.facingCol = 1;
    } else if (angle >= 22.5 && angle < 67.5) {
      this.facing = 'down-right';
      this.facingCol = 0;
    } else if (angle >= 67.5 && angle < 112.5) {
      this.facing = 'down';
      this.facingCol = 4;
    } else if (angle >= 112.5 && angle < 157.5) {
      this.facing = 'down-left';
      this.facingCol = 7;
    } else if (angle >= 157.5 || angle < -157.5) {
      this.facing = 'left';
      this.facingCol = 6;
    } else if (angle >= -157.5 && angle < -112.5) {
      this.facing = 'up-left';
      this.facingCol = 5;
    } else if (angle >= -112.5 && angle < -67.5) {
      this.facing = 'up';
      this.facingCol = 3;
    } else if (angle >= -67.5 && angle < -22.5) {
      this.facing = 'up-right';
      this.facingCol = 2;
    }
  }

  updateAnimation(actualVx, actualVy) {
    this.audioService?.playStep();
    const animKey = `walk-${this.facing}-${this.characterKey}`;
    if (this.scene.anims.exists(animKey)) {
      if (this.sprite.anims.currentAnim?.key !== animKey) {
        this.sprite.play(animKey, true);
      }
    } else {
      // Fallback: play down walk
      const fallbackKey = `walk-down-${this.characterKey}`;
      if (this.scene.anims.exists(fallbackKey) && this.sprite.anims.currentAnim?.key !== fallbackKey) {
        this.sprite.play(fallbackKey, true);
      }
    }
  }

  setIdleFrame() {
    this.sprite.anims.stop();
    // Idle frame is row 1 (passing frame) of the facing column: col + 8
    const idleFrame = this.facingCol + 8;
    this.sprite.setFrame(idleFrame);
  }
}
