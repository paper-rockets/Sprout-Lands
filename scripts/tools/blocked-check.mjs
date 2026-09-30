// Finds "invisible walls": tiles the player cannot walk on although nothing on screen looks solid there.
// A blocked tile is fine when it is water/void, a hedge, fence, wall or cliff tile (the ground picture shows
// it), or when a solid picture (tree, house, rock, chest, gate, oven ...) really has coloured pixels on it.
// Anything else blocks the player but "doesn't look like anything".
//
//   npm run check:blocked            (dev server on 8190 must be running)
//   node scripts/tools/blocked-check.mjs --list     print every tile found, not just the first 12 per area

import { openGame } from './browser.mjs';

const listAll = process.argv.includes('--list');
const game = await openGame('?at=0,0', { width: 1280, height: 720 });
await game.wait(2000);

const result = await game.eval(() => {
  const scene = window.__GAME_DEBUG__.scene;
  const world = scene.world;
  const TILE = 16;
  const F = { LAND: 1, HILL: 8, HEDGE: 32, FENCE: 64, BLOCK: 2048, WALL: 8192 };
  const canvases = new Map();
  const pixels = (sprite) => {
    const key = sprite.texture.key;
    if (!canvases.has(key)) {
      const img = sprite.texture.getSourceImage();
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      canvases.set(key, ctx);
    }
    return canvases.get(key);
  };
  /** Does this picture have a coloured pixel on the tile (tx, ty), or just above it (a trunk's base sits at the top of its foot tile)? Samples a grid of points. */
  const covers = (sprite, tx, ty) => {
    if (!sprite?.visible || !sprite.frame || sprite.displayWidth > 400) return false;
    const w = sprite.displayWidth;
    const h = sprite.displayHeight;
    const left = sprite.x - w * sprite.originX;
    const top = sprite.y - h * sprite.originY;
    if (tx * TILE + TILE <= left || tx * TILE >= left + w || ty * TILE + TILE <= top || ty * TILE >= top + h) return false;
    const f = sprite.frame;
    const ctx = pixels(sprite);
    for (let i = 0; i < 4; i += 1) {
      for (let j = -2; j < 4; j += 1) {
        const px = tx * TILE + 2 + i * 4 - left;
        const py = ty * TILE + 2 + j * 4 - top;
        if (px < 0 || py < 0 || px >= w || py >= h) continue;
        let sx = px / (w / f.cutWidth);
        const sy = py / (h / f.cutHeight);
        if (sprite.flipX) sx = f.cutWidth - 1 - sx;
        if (ctx.getImageData(f.cutX + Math.floor(sx), f.cutY + Math.floor(sy), 1, 1).data[3] > 40) return true;
      }
    }
    return false;
  };

  const sprites = [
    ...scene.objectSprites.values(),
    ...scene.pickups.spots.map((s) => s.sprite),
    ...scene.things.map((t) => t.sprite),
    ...scene.gates.list.map((g) => g.sprite),
    ...scene.gates.doors.map((d) => d.sprite)
  ].filter(Boolean);
  // bucket the pictures by the tiles their boxes touch, so each tile only tests a few
  const buckets = new Map();
  for (const s of sprites) {
    const w = s.displayWidth;
    const h = s.displayHeight;
    if (w > 400) continue;
    const left = s.x - w * s.originX;
    const top = s.y - h * s.originY;
    for (let ty = Math.floor(top / TILE); ty <= Math.floor((top + h - 1) / TILE); ty += 1) {
      for (let tx = Math.floor(left / TILE); tx <= Math.floor((left + w - 1) / TILE); tx += 1) {
        const k = ty * world.width + tx;
        if (!buckets.has(k)) buckets.set(k, []);
        buckets.get(k).push(s);
      }
    }
  }

  const regionAt = (x, y) => world.regions.find((r) => x >= r.ox && y >= r.oy && x < r.ox + (r.width ?? r.w ?? 1e9) && y < r.oy + (r.height ?? r.h ?? 1e9))?.id ?? '?';
  const found = [];
  let blockedLand = 0;
  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      const i = world.idx(x, y);
      if (!world.blocked[i]) continue;
      const f = world.flags[i];
      if (!(f & F.LAND)) continue; // water / void: the sea shows it
      if (f & (F.HEDGE | F.FENCE | F.BLOCK | F.WALL | F.HILL)) continue; // drawn by the ground pictures
      blockedLand += 1;
      const near = buckets.get(i) || [];
      if (near.some((s) => covers(s, x, y))) continue;
      found.push({ x, y, region: regionAt(x, y) });
    }
  }
  return { found, blockedLand, regions: world.regions.map((r) => ({ id: r.id, ox: r.ox, oy: r.oy })) };
});

const jsonAt = process.argv.indexOf('--json');
if (jsonAt > 0) (await import('node:fs')).writeFileSync(process.argv[jsonAt + 1], JSON.stringify(result.found));
const byRegion = {};
for (const t of result.found) (byRegion[t.region] ||= []).push(t);
console.log(`${result.blockedLand} blocked land tiles checked`);
let total = 0;
for (const [region, tiles] of Object.entries(byRegion)) {
  const r = result.regions.find((x) => x.id === region) || { ox: 0, oy: 0 };
  total += tiles.length;
  const shown = (listAll ? tiles : tiles.slice(0, 12)).map((t) => `${t.x - r.ox},${t.y - r.oy}`).join('  ');
  console.log(`FAIL  ${region}: ${tiles.length} blocked tile(s) with nothing solid-looking on them (region x,y): ${shown}${!listAll && tiles.length > 12 ? '  ...' : ''}`);
}
console.log(total ? `${total} invisible wall tile(s)` : 'ok    every blocked tile has something solid-looking on it');
if (game.problems.length) console.log(game.problems);
await game.close();
process.exit(total ? 1 : 0);
