/**
 * World model: turns the content package's text maps into one grid of cells,
 * then works out where the player may walk.
 *
 * Each outdoor island ("region") is a small text map placed at an offset in
 * the world. Rooms are placed in a strip below the islands. Everything here is
 * plain data so it can run in Node tests as well as the game.
 */

export const TILE = 16;

export const F = {
  LAND: 1,
  SAND: 2,
  DARK: 4,
  HILL: 8,
  STAIRS: 16,
  HEDGE: 32,
  FENCE: 64,
  BRIDGE_H: 128,
  BRIDGE_V: 256,
  STONES: 512,
  SNOW: 1024,
  BLOCK: 2048,
  FLOOR: 4096,
  WALL: 8192,
  VOID: 16384
};

/** What each map character means. Content can add or override entries per map. */
export const DEFAULT_LEGEND = {
  '~': [],
  ' ': [],
  '.': ['LAND'],
  ',': ['LAND', 'DARK'],
  ':': ['LAND', 'SAND'],
  h: ['LAND', 'HILL'],
  '^': ['LAND', 'HILL', 'STAIRS'],
  b: ['LAND', 'HEDGE'],
  f: ['LAND', 'FENCE'],
  F: ['LAND', 'SAND', 'FENCE'],
  '=': ['BRIDGE_H'],
  '|': ['BRIDGE_V'],
  o: ['STONES'],
  '*': ['LAND', 'SNOW'],
  '!': ['LAND', 'BLOCK'],
  '?': ['LAND', 'SAND', 'BLOCK'],
  '_': ['FLOOR'],
  W: ['WALL'],
  '#': ['VOID']
};

function legendToFlags(legend) {
  const out = {};
  for (const [ch, names] of Object.entries(legend)) {
    out[ch] = names.reduce((acc, name) => {
      if (!(name in F)) throw new Error(`Unknown map flag "${name}" for character "${ch}"`);
      return acc | F[name];
    }, 0);
  }
  return out;
}

export function mapSize(rows) {
  const height = rows.length;
  const width = rows.reduce((max, row) => Math.max(max, row.length), 0);
  return { width, height };
}

export class WorldModel {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.flags = new Uint16Array(width * height);
    this.regionOf = new Uint8Array(width * height); // 0 = none, otherwise index + 1
    this.blocked = new Uint8Array(width * height);
    this.regions = [];
    this.rooms = [];
    this.outdoor = { x: 0, y: 0, width, height };
  }

  inBounds(x, y) {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  idx(x, y) {
    return y * this.width + x;
  }

  get(x, y) {
    return this.inBounds(x, y) ? this.flags[this.idx(x, y)] : 0;
  }

  has(x, y, flag) {
    return (this.get(x, y) & flag) !== 0;
  }

  regionAt(x, y) {
    if (!this.inBounds(x, y)) return null;
    const i = this.regionOf[this.idx(x, y)];
    return i ? this.regions[i - 1] : null;
  }

  isBlocked(x, y) {
    return !this.inBounds(x, y) || this.blocked[this.idx(x, y)] === 1;
  }
}

/**
 * Paint a text map into the world at (ox, oy).
 * Land always wins; water only fills cells no other map has claimed, so a
 * map's water margin never erases a neighbouring island.
 */
function paintMap(world, rows, ox, oy, legendFlags, regionIndex) {
  for (let y = 0; y < rows.length; y += 1) {
    const row = rows[y];
    for (let x = 0; x < row.length; x += 1) {
      const wx = ox + x;
      const wy = oy + y;
      if (!world.inBounds(wx, wy)) continue;
      const ch = row[x];
      const flags = legendFlags[ch];
      if (flags === undefined) {
        throw new Error(`Unknown map character "${ch}" at row ${y + 1}, column ${x + 1}`);
      }
      const i = world.idx(wx, wy);
      const claimed = world.regionOf[i] !== 0;
      const isFeature = flags !== 0;
      if (isFeature || !claimed) {
        world.flags[i] = flags;
        if (regionIndex && (flags & F.LAND || !claimed)) world.regionOf[i] = regionIndex;
      }
    }
  }
}

/**
 * Build the whole world from the content package.
 * `content.world` is world.json; `content.regions` / `content.rooms` are keyed by id.
 */
export function buildWorld(content, { objectDefs = content.art?.objects || {} } = {}) {
  const worldDef = content.world;
  const [width, height] = worldDef.size;
  const world = new WorldModel(width, height);
  world.outdoor = worldDef.outdoorBounds
    ? { x: worldDef.outdoorBounds[0], y: worldDef.outdoorBounds[1], width: worldDef.outdoorBounds[2], height: worldDef.outdoorBounds[3] }
    : { x: 0, y: 0, width, height };
  const baseLegend = { ...DEFAULT_LEGEND, ...(worldDef.legend || {}) };

  for (const placement of worldDef.regions) {
    const region = content.regions[placement.id];
    if (!region) throw new Error(`world.json places unknown region "${placement.id}"`);
    const legend = legendToFlags({ ...baseLegend, ...(region.legend || {}) });
    const { width: w, height: h } = mapSize(region.map);
    const entry = { ...region, ox: placement.at[0], oy: placement.at[1], width: w, height: h, kind: 'region' };
    world.regions.push(entry);
    paintMap(world, region.map, entry.ox, entry.oy, legend, world.regions.length);
  }

  // Bridges and stepping stones that join islands, written straight in world.json.
  const connectorLegend = legendToFlags(baseLegend);
  for (const connector of worldDef.connectors || []) {
    paintMap(world, connector.map, connector.at[0], connector.at[1], connectorLegend, 0);
  }

  for (const placement of worldDef.rooms || []) {
    const room = content.rooms[placement.id];
    if (!room) throw new Error(`world.json places unknown room "${placement.id}"`);
    const legend = legendToFlags({ ...baseLegend, ...(room.legend || {}) });
    const { width: w, height: h } = mapSize(room.map);
    const entry = { ...room, ox: placement.at[0], oy: placement.at[1], width: w, height: h, kind: 'room' };
    world.rooms.push(entry);
    world.regions.push(entry);
    paintMap(world, room.map, entry.ox, entry.oy, legend, world.regions.length);
  }

  computeBlocked(world, objectDefs);
  return world;
}

/** A raised cell whose outline touches lower ground; players stay off these. */
export function isRaisedEdge(world, x, y, flag) {
  if (!world.has(x, y, flag)) return false;
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      if (!world.has(x + dx, y + dy, flag)) return true;
    }
  }
  return false;
}

/**
 * Recalculate which cells are solid. `isPresent(obj)` lets the game leave out
 * objects that are currently hidden (for example a bush that moves aside once
 * a quest opens the path).
 */
export function computeBlocked(world, objectDefs = {}, isPresent = () => true) {
  const { width, height } = world;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const f = world.flags[world.idx(x, y)];
      const walkableGround = (f & (F.LAND | F.BRIDGE_H | F.BRIDGE_V | F.STONES | F.FLOOR)) !== 0;
      let blocked = !walkableGround || (f & (F.HEDGE | F.FENCE | F.BLOCK | F.WALL | F.VOID)) !== 0;
      if (!blocked && (f & F.HILL) && !(f & F.STAIRS) && isRaisedEdge(world, x, y, F.HILL)) blocked = true;
      world.blocked[world.idx(x, y)] = blocked ? 1 : 0;
    }
  }
  // Solid parts of trees, rocks, houses and furniture, and of things marked "solid" (an oven, a shop counter).
  for (const region of world.regions) {
    for (const obj of region.objects || []) {
      if (isPresent(obj, region)) applyFootprint(world, region, obj, objectDefs, 1);
    }
    for (const entity of region.entities || []) {
      if (entity.solid && entity.kind !== 'blocker') applyFootprint(world, region, { type: entity.object, at: entity.at }, objectDefs, 1);
    }
  }
  // Blockers (a log on a bridge, a bush across a path) come and go with the story, so remember
  // what each cell is like without them.
  world.baseBlocked = world.blocked.slice();
  for (const region of world.regions) {
    for (const entity of region.entities || []) {
      if (entity.kind === 'blocker') setBlocker(world, region, entity, objectDefs, isPresent(entity, region));
    }
  }
}

/** World cells a blocker covers: its own tile plus its picture's solid footprint. */
export function blockerCells(region, entity, objectDefs) {
  const cells = footprintCells(region, { type: entity.object, at: entity.at }, objectDefs);
  const own = [Math.floor(region.ox + entity.at[0]), Math.floor(region.oy + entity.at[1])];
  if (!cells.some(([x, y]) => x === own[0] && y === own[1])) cells.push(own);
  return cells;
}

/** Put a blocker in the way (present) or take it away, restoring what was underneath. */
export function setBlocker(world, region, entity, objectDefs, present) {
  for (const [x, y] of blockerCells(region, entity, objectDefs)) {
    if (!world.inBounds(x, y)) continue;
    const i = world.idx(x, y);
    world.blocked[i] = present ? 1 : world.baseBlocked[i];
  }
}

/** World tile coordinates covered by an object's solid footprint. */
export function footprintCells(region, obj, objectDefs) {
  const def = objectDefs[obj.type];
  if (!def) return [];
  const [ax, ay] = obj.at;
  const baseX = Math.floor(region.ox + ax);
  const baseY = Math.floor(region.oy + ay);
  const cells = [];
  for (const [dx, dy] of def.foot || []) {
    cells.push([baseX + dx, baseY + dy]);
  }
  return cells;
}

export function applyFootprint(world, region, obj, objectDefs, value) {
  for (const [x, y] of footprintCells(region, obj, objectDefs)) {
    if (world.inBounds(x, y)) world.blocked[world.idx(x, y)] = value;
  }
}

/** Convert region-local tile coordinates (which may be fractional) to world pixels at the tile centre. */
export function localToWorldPx(region, at) {
  return {
    x: (region.ox + at[0]) * TILE + TILE / 2,
    y: (region.oy + at[1]) * TILE + TILE / 2
  };
}

/** Flood fill from a start cell over walkable cells; returns a Uint8Array of reached cells. */
export function floodReachable(world, startX, startY, extraBlocked = null) {
  const reached = new Uint8Array(world.width * world.height);
  if (world.isBlocked(startX, startY)) return reached;
  const queue = [startX, startY];
  reached[world.idx(startX, startY)] = 1;
  let head = 0;
  while (head < queue.length) {
    const x = queue[head++];
    const y = queue[head++];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (!world.inBounds(nx, ny)) continue;
      const i = world.idx(nx, ny);
      if (reached[i] || world.blocked[i] || (extraBlocked && extraBlocked[i])) continue;
      reached[i] = 1;
      queue.push(nx, ny);
    }
  }
  return reached;
}
