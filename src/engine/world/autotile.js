/**
 * Autotile rules for the Sprout Lands tile sheets.
 *
 * "blob47" is the 11 x 5 layout Cup Nooble uses for grass, hills, soil,
 * hedges and snow (see "Bitmask references 1.png" in the Premium pack).
 * Each cell is described by a 3 x 3 picture read left-to-right, top-to-bottom:
 * NW N NE / W C E / SW S SE, where '#' means "the same ground continues".
 *
 * Pure functions only, so the rules can be tested without Phaser.
 */

const BLOB47_LAYOUT = [
  [0, 0, '....##.##'], [1, 0, '...######'], [2, 0, '...##.##.'], [3, 0, '....#..#.'], [4, 0, '....##.#.'],
  [5, 0, '...#####.'], [6, 0, '...###.##'], [7, 0, '...##..#.'], [8, 0, '...###.#.'], [9, 0, '##.###.##'],
  [0, 1, '.##.##.##'], [1, 1, '#########'], [2, 1, '##.##.##.'], [3, 1, '.#..#..#.'], [4, 1, '.##.##.#.'],
  [5, 1, '########.'], [6, 1, '######.##'], [7, 1, '##.##..#.'], [8, 1, '######.#.'], [9, 1, '.#######.'],
  [0, 2, '.##.##...'], [1, 2, '######...'], [2, 2, '##.##....'], [3, 2, '.#..#....'], [4, 2, '.#..##.##'],
  [5, 2, '##.######'], [6, 2, '.########'], [7, 2, '.#.##.##.'], [8, 2, '.#.######'], [9, 2, '.#.###.##'],
  [10, 2, '.#.#####.'],
  [0, 3, '....##...'], [1, 3, '...###...'], [2, 3, '...##....'], [3, 3, '....#....'], [4, 3, '.#..##...'],
  [5, 3, '##.###...'], [6, 3, '.#####...'], [7, 3, '.#.##....'], [8, 3, '.#.###...'], [9, 3, '.#####.#.'],
  [10, 3, '##.###.#.'],
  [4, 4, '.#..##.#.'], [5, 4, '##.#####.'], [6, 4, '.#####.##'], [7, 4, '.#.##..#.'], [8, 4, '.#.###.#.']
];

export const DIR = { N: 1, NE: 2, E: 4, SE: 8, S: 16, SW: 32, W: 64, NW: 128 };
const PICTURE_ORDER = ['NW', 'N', 'NE', 'W', 'C', 'E', 'SW', 'S', 'SE'];
export const FULL_MASK = 255;

/** Corners only matter when both touching sides continue. */
export function reduceMask(mask) {
  let m = mask;
  if (!((m & DIR.N) && (m & DIR.E))) m &= ~DIR.NE;
  if (!((m & DIR.S) && (m & DIR.E))) m &= ~DIR.SE;
  if (!((m & DIR.S) && (m & DIR.W))) m &= ~DIR.SW;
  if (!((m & DIR.N) && (m & DIR.W))) m &= ~DIR.NW;
  return m;
}

function pictureToMask(picture) {
  let mask = 0;
  PICTURE_ORDER.forEach((key, i) => {
    if (key !== 'C' && picture[i] === '#') mask |= DIR[key];
  });
  return mask;
}

const BLOB47_BY_MASK = new Map();
for (const [col, row, picture] of BLOB47_LAYOUT) {
  BLOB47_BY_MASK.set(pictureToMask(picture), { col, row });
}

/** Neighbour mask for cell (x, y); `same(x, y)` says whether a cell counts as the same ground. */
export function neighbourMask(x, y, same) {
  let m = 0;
  if (same(x, y - 1)) m |= DIR.N;
  if (same(x + 1, y - 1)) m |= DIR.NE;
  if (same(x + 1, y)) m |= DIR.E;
  if (same(x + 1, y + 1)) m |= DIR.SE;
  if (same(x, y + 1)) m |= DIR.S;
  if (same(x - 1, y + 1)) m |= DIR.SW;
  if (same(x - 1, y)) m |= DIR.W;
  if (same(x - 1, y - 1)) m |= DIR.NW;
  return reduceMask(m);
}

/** Sheet cell {col,row} for a blob47 sheet, given a (reduced) neighbour mask. */
export function blob47Cell(mask) {
  return BLOB47_BY_MASK.get(reduceMask(mask)) || BLOB47_BY_MASK.get(FULL_MASK);
}

export const BLOB47_MASK_COUNT = BLOB47_BY_MASK.size;

/**
 * Fence pieces in Fences.png: the first 4 x 4 cells, keyed by which sides
 * connect (N, E, S, W).
 */
const FENCE_LAYOUT = {
  '': [0, 3], S: [0, 0], NS: [0, 1], N: [0, 2],
  E: [1, 3], EW: [2, 3], W: [3, 3],
  ES: [1, 0], ESW: [2, 0], SW: [3, 0],
  NES: [1, 1], NESW: [2, 1], NSW: [3, 1],
  NE: [1, 2], NEW: [2, 2], NW: [3, 2]
};

export function fenceCell(n, e, s, w) {
  const key = `${n ? 'N' : ''}${e ? 'E' : ''}${s ? 'S' : ''}${w ? 'W' : ''}`;
  const [col, row] = FENCE_LAYOUT[key];
  return { col, row };
}

/** Small, stable hash so decoration choices never change between loads. */
export function cellHash(x, y, salt = 0) {
  let h = (x * 374761393 + y * 668265263 + salt * 2246822519) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/**
 * Pick an interior fill tile: mostly the plain one (fill[0]), sometimes a
 * decorated variant. `chance` is how often a variant is used (0..1).
 */
export function pickFill(fill, x, y, salt = 0, chance = 0.25) {
  if (!fill || fill.length === 0) return { col: 1, row: 1 };
  const h = cellHash(x, y, salt);
  if (fill.length === 1 || (h % 1000) >= chance * 1000) return { col: fill[0][0], row: fill[0][1] };
  const [col, row] = fill[1 + ((h >>> 10) % (fill.length - 1))];
  return { col, row };
}
