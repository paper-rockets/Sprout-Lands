/**
 * Grid-based Navigation and Pathfinding Service.
 * Implements A* search on a 16px tile grid with:
 * - Safe 8-way diagonals (prevents cutting through diagonal corner obstacles)
 * - Reachability fallback (finds nearest valid tile if destination is blocked)
 * - Path smoothing (removes zig-zags across open ground)
 * - Collision sliding for continuous controller movement
 */

export class NavigationService {
  constructor({ gridWidth = 60, gridHeight = 34, tileSize = 16 } = {}) {
    this.gridWidth = gridWidth;
    this.gridHeight = gridHeight;
    this.tileSize = tileSize;
    this.grid = Array.from({ length: gridHeight }, () => new Uint8Array(gridWidth));
  }

  setCollision(tileX, tileY, isBlocked) {
    if (tileX >= 0 && tileX < this.gridWidth && tileY >= 0 && tileY < this.gridHeight) {
      this.grid[tileY][tileX] = isBlocked ? 1 : 0;
    }
  }

  setRectCollision(tileX, tileY, widthTiles, heightTiles, isBlocked) {
    for (let y = tileY; y < tileY + heightTiles; y++) {
      for (let x = tileX; x < tileX + widthTiles; x++) {
        this.setCollision(x, y, isBlocked);
      }
    }
  }

  isBlocked(tileX, tileY) {
    if (tileX < 0 || tileX >= this.gridWidth || tileY < 0 || tileY >= this.gridHeight) {
      return true; // Out of bounds is blocked
    }
    return this.grid[tileY][tileX] === 1;
  }

  isWalkable(tileX, tileY) {
    return !this.isBlocked(tileX, tileY);
  }

  worldToTile(worldX, worldY) {
    return {
      x: Math.floor(worldX / this.tileSize),
      y: Math.floor(worldY / this.tileSize)
    };
  }

  tileToWorld(tileX, tileY) {
    return {
      x: tileX * this.tileSize + this.tileSize / 2,
      y: tileY * this.tileSize + this.tileSize / 2
    };
  }

  /**
   * Find a path between world coordinates using A*.
   * If target is blocked, automatically routes to the closest reachable adjacent tile.
   */
  findPath(startWorldX, startWorldY, targetWorldX, targetWorldY) {
    const startTile = this.worldToTile(startWorldX, startWorldY);
    let targetTile = this.worldToTile(targetWorldX, targetWorldY);

    // Clamp coordinates to grid
    startTile.x = Math.max(0, Math.min(this.gridWidth - 1, startTile.x));
    startTile.y = Math.max(0, Math.min(this.gridHeight - 1, startTile.y));
    targetTile.x = Math.max(0, Math.min(this.gridWidth - 1, targetTile.x));
    targetTile.y = Math.max(0, Math.min(this.gridHeight - 1, targetTile.y));

    // If already at target tile, return single point
    if (startTile.x === targetTile.x && startTile.y === targetTile.y) {
      return [{ x: targetWorldX, y: targetWorldY }];
    }

    // If destination is blocked, find the closest reachable adjacent tile
    const targetWasBlocked = this.isBlocked(targetTile.x, targetTile.y);
    if (targetWasBlocked) {
      const nearest = this.findNearestWalkable(targetTile.x, targetTile.y, startTile);
      if (!nearest) return [];
      targetTile = nearest;
    }

    const pathTiles = this.searchAStar(startTile, targetTile);
    if (!pathTiles || pathTiles.length === 0) return [];

    // Convert tiles to world points
    const worldPoints = pathTiles.map(t => this.tileToWorld(t.x, t.y));

    // Smooth path with line-of-sight checks
    const smoothed = this.smoothPath(worldPoints);

    // Replace final point with exact target coordinate only if target was originally walkable
    if (smoothed.length > 0 && !targetWasBlocked) {
      smoothed[smoothed.length - 1] = { x: targetWorldX, y: targetWorldY };
    }

    return smoothed;
  }

  /**
   * Core A* search with safe diagonal checks.
   */
  searchAStar(start, target) {
    const width = this.gridWidth;
    const height = this.gridHeight;
    const key = (x, y) => y * width + x;

    const openSet = new Set([key(start.x, start.y)]);
    const cameFrom = new Map();

    const gScore = new Map();
    gScore.set(key(start.x, start.y), 0);

    const fScore = new Map();
    const heuristic = (x1, y1, x2, y2) => {
      const dx = Math.abs(x1 - x2);
      const dy = Math.abs(y1 - y2);
      // Octile distance heuristic
      return (dx + dy) + (1.414 - 2) * Math.min(dx, dy);
    };
    fScore.set(key(start.x, start.y), heuristic(start.x, start.y, target.x, target.y));

    // 8 directions: [dx, dy, cost, isDiagonal]
    const neighbors = [
      [0, -1, 1, false],
      [0, 1, 1, false],
      [-1, 0, 1, false],
      [1, 0, 1, false],
      [-1, -1, 1.414, true],
      [1, -1, 1.414, true],
      [-1, 1, 1.414, true],
      [1, 1, 1.414, true]
    ];

    while (openSet.size > 0) {
      // Find node in openSet with lowest fScore
      let currentKey = null;
      let lowestF = Infinity;
      for (const k of openSet) {
        const f = fScore.get(k) ?? Infinity;
        if (f < lowestF) {
          lowestF = f;
          currentKey = k;
        }
      }

      const currX = currentKey % width;
      const currY = Math.floor(currentKey / width);

      if (currX === target.x && currY === target.y) {
        // Reconstruct path
        const path = [{ x: currX, y: currY }];
        let trackKey = currentKey;
        while (cameFrom.has(trackKey)) {
          trackKey = cameFrom.get(trackKey);
          path.unshift({
            x: trackKey % width,
            y: Math.floor(trackKey / width)
          });
        }
        return path;
      }

      openSet.delete(currentKey);

      for (const [dx, dy, cost, isDiagonal] of neighbors) {
        const nx = currX + dx;
        const ny = currY + dy;

        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        if (this.isBlocked(nx, ny)) continue;

        // Safe diagonal: prevent cutting through solid corners
        if (isDiagonal) {
          if (this.isBlocked(currX + dx, currY) || this.isBlocked(currX, currY + dy)) {
            continue;
          }
        }

        const neighborKey = key(nx, ny);
        const tentativeG = (gScore.get(currentKey) ?? Infinity) + cost;

        if (tentativeG < (gScore.get(neighborKey) ?? Infinity)) {
          cameFrom.set(neighborKey, currentKey);
          gScore.set(neighborKey, tentativeG);
          fScore.set(neighborKey, tentativeG + heuristic(nx, ny, target.x, target.y));
          openSet.add(neighborKey);
        }
      }
    }

    return null; // No path found
  }

  /**
   * Find nearest reachable walkable tile via BFS outwards.
   */
  findNearestWalkable(targetX, targetY, startTile) {
    const queue = [{ x: targetX, y: targetY }];
    const visited = new Set();
    const key = (x, y) => `${x},${y}`;
    visited.add(key(targetX, targetY));

    const offsets = [
      [0, -1], [0, 1], [-1, 0], [1, 0],
      [-1, -1], [1, -1], [-1, 1], [1, 1]
    ];

    while (queue.length > 0) {
      const curr = queue.shift();
      if (this.isWalkable(curr.x, curr.y)) {
        return curr;
      }

      for (const [dx, dy] of offsets) {
        const nx = curr.x + dx;
        const ny = curr.y + dy;
        if (nx >= 0 && nx < this.gridWidth && ny >= 0 && ny < this.gridHeight) {
          const k = key(nx, ny);
          if (!visited.has(k)) {
            visited.add(k);
            queue.push({ x: nx, y: ny });
          }
        }
      }

      // Limit search radius to 12 tiles
      if (visited.size > 200) break;
    }

    return null;
  }

  /**
   * Line of sight check between two world positions.
   * Uses stepped sampling across the ray to ensure no obstacle intersects.
   */
  hasLineOfSight(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy);
    const steps = Math.ceil(dist / (this.tileSize / 2));
    if (steps <= 1) return true;

    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const sampleX = x1 + dx * t;
      const sampleY = y1 + dy * t;
      const tile = this.worldToTile(sampleX, sampleY);
      if (this.isBlocked(tile.x, tile.y)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Smooth path by skipping intermediate points with direct line of sight.
   */
  smoothPath(points) {
    if (points.length <= 2) return points;

    const smoothed = [points[0]];
    let currentIdx = 0;

    while (currentIdx < points.length - 1) {
      let furthest = currentIdx + 1;
      for (let i = points.length - 1; i > currentIdx; i--) {
        if (this.hasLineOfSight(points[currentIdx].x, points[currentIdx].y, points[i].x, points[i].y)) {
          furthest = i;
          break;
        }
      }
      smoothed.push(points[furthest]);
      currentIdx = furthest;
    }

    return smoothed;
  }

  /**
   * Collision sliding helper:
   * When moving continuously via keyboard/joystick, checks whether movement
   * along X or Y is blocked. If an obstacle blocks one axis, slides along the other.
   */
  computeSlideVector(worldX, worldY, vx, vy, radius = 6) {
    if (vx === 0 && vy === 0) return { vx: 0, vy: 0 };

    let outVx = vx;
    let outVy = vy;

    // Check X movement
    if (vx !== 0) {
      const testX = worldX + (vx > 0 ? radius : -radius) + vx;
      const tileTop = this.worldToTile(testX, worldY - radius + 2);
      const tileBot = this.worldToTile(testX, worldY + radius - 2);
      if (this.isBlocked(tileTop.x, tileTop.y) || this.isBlocked(tileBot.x, tileBot.y)) {
        outVx = 0;
      }
    }

    // Check Y movement
    if (vy !== 0) {
      const testY = worldY + (vy > 0 ? radius : -radius) + vy;
      const tileLeft = this.worldToTile(worldX - radius + 2, testY);
      const tileRight = this.worldToTile(worldX + radius - 2, testY);
      if (this.isBlocked(tileLeft.x, tileLeft.y) || this.isBlocked(tileRight.x, tileRight.y)) {
        outVy = 0;
      }
    }

    return { vx: outVx, vy: outVy };
  }
}
