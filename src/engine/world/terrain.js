/**
 * Terrain layers: turns the world grid into the ground tiles the game draws.
 *
 * Built the way Cup Nooble's own "TILE LAYER EXAMPLE" stacks the tiles:
 *   soil      - sand/soil under the land; its brown rim shows where sand meets water
 *   grass     - grass on top: a soft green edge on the coast ("grassSoft"), or the
 *               softer layer edge where the grass meets sand ("grassLayer")
 *   dark      - darker grass patches
 *   hill      - raised grass with a short cliff
 *   hedge     - bush walls and the deep forest mass
 *   bridge    - bridge planks and piers
 *   stones    - stepping stones
 *   fence     - fence pieces
 * Water is drawn separately, under everything.
 *
 * Plain data in, plain data out, so tests can check it without Phaser.
 */

import { F } from './worldModel.js';
import { FULL_MASK, blob47Cell, cellHash, fenceCell, neighbourMask, pickFill } from './autotile.js';

export const EMPTY = -1;

export function buildTerrain(world, tilesets, options = {}) {
  const { width, height } = world;
  const coastStyle = options.coastStyle || 'soft';
  const layers = [];

  const addLayer = (id, key) => {
    const ts = tilesets[key];
    if (!ts) throw new Error(`art.json has no tileset "${key}"`);
    if (!ts.columns) throw new Error(`art.json tileset "${key}" needs "columns"`);
    const layer = { id, tileset: key, texture: ts.texture, columns: ts.columns, data: new Int32Array(width * height).fill(EMPTY), count: 0 };
    layers.push(layer);
    return layer;
  };
  // A region can swap in its own ground pictures (region JSON "tiles": { "hedge": "hwHedge", ... },
  // keyed by the normal tileset name). Swapped cells go into an extra layer drawn right after the
  // normal one, so every layer still has one tileset.
  const regionTiles = (x, y) => (world.regionAt ? world.regionAt(x, y)?.tiles : null);
  const altOf = (layer, x, y) => {
    const key = regionTiles(x, y)?.[layer.tileset];
    if (!key || key === layer.tileset) return layer;
    layer.alts ||= {};
    if (!layer.alts[key]) {
      const ts = tilesets[key];
      if (!ts) throw new Error(`art.json has no tileset "${key}"`);
      layer.alts[key] = { id: `${layer.id}-${key}`, tileset: key, texture: ts.texture, columns: ts.columns, data: new Int32Array(width * height).fill(EMPTY), count: 0 };
    }
    return layer.alts[key];
  };
  const put = (base, x, y, cell) => {
    const layer = altOf(base, x, y);
    layer.data[y * width + x] = cell.row * layer.columns + cell.col;
    layer.count += 1;
  };
  const setOf = (base, x, y) => tilesets[altOf(base, x, y).tileset];

  // Past the edge of the map, pretend the nearest edge cell continues,
  // so land that runs off the map doesn't get a coast along the border.
  const clampX = (x) => (x < 0 ? 0 : x >= width ? width - 1 : x);
  const clampY = (y) => (y < 0 ? 0 : y >= height ? height - 1 : y);
  const has = (x, y, flag) => (world.flags[clampY(y) * width + clampX(x)] & flag) !== 0;

  const isLand = (x, y) => has(x, y, F.LAND);
  const isSand = (x, y) => has(x, y, F.SAND);
  const isSnow = (x, y) => has(x, y, F.SNOW);
  const isGrass = (x, y) => isLand(x, y) && !isSand(x, y) && !isSnow(x, y);
  const isDark = (x, y) => has(x, y, F.DARK);
  const isHill = (x, y) => has(x, y, F.HILL);
  const isHedge = (x, y) => has(x, y, F.HEDGE);
  const nearSand = (x, y) => {
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if ((dx || dy) && isLand(x + dx, y + dy) && isSand(x + dx, y + dy)) return true;
      }
    }
    return false;
  };

  const blobTile = (ts, mask, x, y, salt) => (mask === FULL_MASK
    ? pickFill(ts.fill, x, y, salt, ts.fillChance)
    : blob47Cell(mask));

  const soil = addLayer('soil', 'soil');
  const grassSoft = addLayer('grass-soft', 'grassSoft');
  const grassLayer = addLayer('grass-layer', 'grassLayer');
  const dark = addLayer('dark', 'grassDark');
  const hill = addLayer('hill', 'hill');
  const hedge = addLayer('hedge', 'hedge');
  const bridge = addLayer('bridge', 'bridge');
  const stones = addLayer('stones', 'stones');
  const fence = addLayer('fence', 'fence');

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const f = world.flags[y * width + x];

      if (f & F.LAND) {
        // Grass on top (unless this is sand or snow).
        let grassCovers = false;
        if (isGrass(x, y)) {
          const mask = neighbourMask(x, y, isGrass);
          const useLayer = coastStyle === 'layer' || nearSand(x, y);
          const target = useLayer ? grassLayer : grassSoft;
          put(target, x, y, blobTile(setOf(target, x, y), mask, x, y, 2));
          grassCovers = mask === FULL_MASK;
        }
        // Soil underneath, only where it can be seen.
        if (!grassCovers) {
          put(soil, x, y, blobTile(setOf(soil, x, y), neighbourMask(x, y, isLand), x, y, 1));
        }
        if (f & F.DARK) put(dark, x, y, blobTile(setOf(dark, x, y), neighbourMask(x, y, isDark), x, y, 3));
        if (f & F.HILL) put(hill, x, y, blobTile(setOf(hill, x, y), neighbourMask(x, y, isHill), x, y, 4));
        if (f & F.HEDGE) {
          const mask = neighbourMask(x, y, isHedge);
          const hts = setOf(hedge, x, y);
          let cell;
          if (mask === FULL_MASK && deepInside(x, y, isHedge, 2)) {
            cell = pickFill(hts.deepFill, x, y, 5, hts.deepFillChance);
          } else {
            cell = blobTile(hts, mask, x, y, 5);
          }
          put(hedge, x, y, cell);
        }
        if (f & F.FENCE) {
          const isFence = (fx, fy) => fx >= 0 && fy >= 0 && fx < width && fy < height && (world.flags[fy * width + fx] & F.FENCE) !== 0;
          put(fence, x, y, fenceCell(isFence(x, y - 1), isFence(x + 1, y), isFence(x, y + 1), isFence(x - 1, y)));
        }
      }

      if (f & F.BRIDGE_H) put(bridge, x, y, bridgePiece(world, x, y, 'h'));
      if (f & F.BRIDGE_V) put(bridge, x, y, bridgePiece(world, x, y, 'v'));
      if (f & F.STONES) {
        const cells = tilesets.stones.cells;
        const [col, row] = cells[cellHash(x, y, 6) % cells.length];
        put(stones, x, y, { col, row });
      }
    }
  }

  return layers.flatMap((layer) => [layer, ...Object.values(layer.alts || {})]).filter((layer) => layer.count > 0);
}

/** True when every cell within `radius` is the same kind (used for the deep forest mass). */
function deepInside(x, y, same, radius) {
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      if (!same(x + dx, y + dy)) return false;
    }
  }
  return true;
}

/**
 * Wooden_Bridge_v2 pieces (16 x 16 cells, 4 columns):
 *   horizontal: left end (0,r), middle (0,2), right end (1,r)
 *   vertical:   top end (c,0),  middle (2,2), bottom end (c,1)
 * The end pieces come with and without a splash of foam around the posts;
 * foam is used when the end stands in open water (a pier), none when it rests on land.
 */
function bridgePiece(world, x, y, dir) {
  const flag = dir === 'h' ? F.BRIDGE_H : F.BRIDGE_V;
  const [ax, ay, bx, by] = dir === 'h' ? [x - 1, y, x + 1, y] : [x, y - 1, x, y + 1];
  const startOfRun = !world.has(ax, ay, flag);
  const endOfRun = !world.has(bx, by, flag);
  if (!startOfRun && !endOfRun) return dir === 'h' ? { col: 0, row: 2 } : { col: 2, row: 2 };
  const beyond = startOfRun ? [ax, ay] : [bx, by];
  const foam = !world.has(beyond[0], beyond[1], F.LAND);
  if (dir === 'h') return startOfRun ? { col: 0, row: foam ? 1 : 0 } : { col: 1, row: foam ? 1 : 0 };
  return startOfRun ? { col: foam ? 3 : 2, row: 0 } : { col: foam ? 3 : 2, row: 1 };
}
