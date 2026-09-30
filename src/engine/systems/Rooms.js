/**
 * Rooms: places you step into through a door (the inside of a house; a cave can be one too).
 *
 * Every room sits in the same big grid as the islands, in a strip below them (world.json "rooms",
 * with "outdoorBounds" saying where the islands end), so walking, saving, followers and the world
 * check all work inside without anything special. This file only adds:
 *   - drawing the room's walls and floor (art.json "rooms" styles),
 *   - the doorways: walk up into a house's door and the screen fades to the room; walk down through
 *     the gap in the room's bottom wall and you are back outside, one step below that door,
 *   - the camera: a room smaller than the screen sits in the middle, with a dark edge around it.
 *
 * A room file names its own way in: "door": { "region": "east", "at": [x, y] } (the house's doorway
 * tile in that region) and "exit": [x, y] (the gap in its bottom wall).
 */

import { TILE } from '../world/worldModel.js';

const FADE_MS = 220;
const DOOR_DEPTH = 10; // pixels from the doorway's top edge: walking this far up into it goes inside
const EXIT_DEPTH = 8; // pixels into the exit gap that take you back out
const OUTDOOR_BACKGROUND = 0x9bd4c3;
const COVER_DEPTH = 1000000; // above everything in the world (the menus are drawn by another scene, on top)

const hexColour = (value, fallback) => (typeof value === 'string' ? parseInt(value.replace('#', ''), 16) : value ?? fallback);

export class Rooms {
  constructor(scene) {
    this.scene = scene;
    this.world = scene.world;
    this.art = scene.content.art.rooms || { styles: {} };
    this.voidColour = hexColour(this.art.void, 0x2a1f2b);
    this.links = [];
    this.current = null; // the link of the room the player is in, or null outdoors
    this.busy = false; // true while the screen fades between places
    // Four dark covers round the room you are in, so the sea, the islands and the other rooms never show.
    this.covers = [0, 1, 2, 3].map(() => scene.add.rectangle(0, 0, 1, 1, this.voidColour).setOrigin(0, 0).setDepth(COVER_DEPTH).setVisible(false));
    for (const room of this.world.rooms) {
      const region = this.world.regions.find((r) => r.kind === 'region' && r.id === room.door?.region);
      if (!region || !room.exit) {
        console.warn(`[rooms] "${room.id}" needs "door": { "region", "at" } and "exit": [x, y]`);
        continue;
      }
      const door = { x: region.ox + room.door.at[0], y: region.oy + room.door.at[1] };
      const exit = { x: room.ox + room.exit[0], y: room.oy + room.exit[1] };
      this.links.push({
        room,
        region,
        door,
        exit,
        outside: { x: door.x * TILE + TILE / 2, y: (door.y + 2) * TILE - 3 }, // standing just below the door
        inside: { x: exit.x * TILE + TILE / 2, y: exit.y * TILE - 2 } // standing just inside the exit gap
      });
    }
  }

  /* ---------------- drawing ---------------- */

  draw(depth) {
    for (const link of this.links) {
      const { room } = link;
      const style = this.art.styles?.[room.style];
      if (!style) {
        console.warn(`[rooms] "${room.id}" uses style "${room.style}", which art.json rooms.styles does not have`);
        continue;
      }
      if (style.shape === 'cave') {
        this.drawCave(style, room, depth);
        continue;
      }
      const data = room.map.map((row, y) => [...row].map((ch, x) => this.piece(style, room, x, y, ch)));
      const map = this.scene.make.tilemap({ data, tileWidth: TILE, tileHeight: TILE });
      const tileset = map.addTilesetImage(style.tex, style.tex, TILE, TILE, 0, 0);
      map.createLayer(0, tileset, room.ox * TILE, room.oy * TILE).setDepth(depth);
    }
  }

  /** Which piece of the style's sheet a room cell shows. */
  piece(style, room, x, y, ch) {
    const w = room.width;
    const h = room.height;
    const [ex, ey] = room.exit;
    if (ch !== 'W') return x === ex && y === ey ? style.door : style.floor;
    const left = x === 0;
    const right = x === w - 1;
    if (y === 0) return left ? style.topLeft : right ? style.topRight : style.backTop;
    if (y === h - 1) {
      if (left) return style.bottomLeft;
      if (right) return style.bottomRight;
      if (y === ey && x === ex - 1) return style.frontLeftOfDoor;
      if (y === ey && x === ex + 1) return style.frontRightOfDoor;
      return style.front;
    }
    if (left) return style.left;
    if (right) return style.right;
    return style.backBottom;
  }

  /**
   * A cave is any shape, not a box: 'W' rock, '_' floor. Rock with floor just below it shows its
   * stone front; all other rock shows its dark top, with a stone rim on each side that meets floor
   * or a front. The floor is a second picture sheet drawn underneath. Pieces are [column, row]
   * in the sheets; "top" is where the 4 x 4 block of rock tops starts (see art.json rooms.about).
   */
  drawCave(style, room, depth) {
    const { width: w, height: h } = room;
    const rock = (x, y) => x < 0 || y < 0 || x >= w || y >= h || room.map[y][x] === 'W';
    const front = (x, y) => rock(x, y) && y + 1 < h && !rock(x, y + 1);
    const top = (x, y) => rock(x, y) && !front(x, y);
    const floorSheet = this.sheetColumns(style.floorTex);
    const wallSheet = this.sheetColumns(style.tex);
    const at = (cols, [c, r]) => r * cols + c;
    const pick = (list, x, y) => list[(((x * 73856093) ^ (y * 19349663)) >>> 0) % list.length];
    const floor = [];
    const walls = [];
    for (let y = 0; y < h; y++) {
      floor.push([]);
      walls.push([]);
      for (let x = 0; x < w; x++) {
        const rare = (((x * 2654435761) ^ (y * 40503)) >>> 0) % (style.rareEvery || 8) === 0;
        floor[y].push(rock(x, y) && !front(x, y) ? -1 : at(floorSheet, pick(rare ? style.floorRare : style.floor, x, y)));
        if (front(x, y)) {
          const l = front(x - 1, y);
          const r = front(x + 1, y);
          const f = style.front;
          walls[y].push(at(wallSheet, l && r ? pick(f.middle, x, y) : l ? f.right : r ? f.left : f.single));
        } else if (top(x, y)) {
          const col = [top(x - 1, y), top(x + 1, y)];
          const row = [top(x, y - 1), top(x, y + 1)];
          const index = ([a, b]) => (a && b ? 1 : b ? 0 : a ? 2 : 3);
          walls[y].push(at(wallSheet, [style.top[0] + index(col), style.top[1] + index(row)]));
        } else {
          walls[y].push(-1);
        }
      }
    }
    for (const [data, tex, d] of [[floor, style.floorTex, depth], [walls, style.tex, depth + 0.5]]) {
      const map = this.scene.make.tilemap({ data, tileWidth: TILE, tileHeight: TILE });
      const tileset = map.addTilesetImage(tex, tex, TILE, TILE, 0, 0);
      map.createLayer(0, tileset, room.ox * TILE, room.oy * TILE).setDepth(d);
    }
  }

  sheetColumns(tex) {
    return Math.floor(this.scene.textures.get(tex).getSourceImage().width / TILE);
  }

  /* ---------------- where the player is ---------------- */

  linkAt(px, py) {
    const room = this.world.regionAt(Math.floor(px / TILE), Math.floor((py - 1) / TILE));
    return room?.kind === 'room' ? this.links.find((l) => l.room === room) || null : null;
  }

  /** After loading: if the save put the player inside a room, be in that room. */
  placeFromPlayer() {
    const p = this.scene.player;
    this.current = this.linkAt(p.x, p.y);
    if (this.current) p.region = this.current.room.id;
    this.applyCamera();
  }

  /** On the map, somebody inside a room shows at the door they went in by. */
  mapPosition(x, y) {
    const link = this.linkAt(x, y);
    return link ? { x: link.outside.x, y: link.outside.y } : { x, y };
  }

  /* ---------------- the camera ---------------- */

  /** Keep the camera on the islands outdoors, or on the room (in the middle of the screen when it is small). */
  applyCamera() {
    const cam = this.scene.cameras.main;
    if (!this.current) {
      const o = this.world.outdoor;
      cam.setBounds(o.x * TILE, o.y * TILE, o.width * TILE, o.height * TILE);
      cam.setBackgroundColor(OUTDOOR_BACKGROUND);
      for (const cover of this.covers) cover.setVisible(false);
      return;
    }
    const { room } = this.current;
    const viewW = Math.ceil(cam.width / cam.zoom);
    const viewH = Math.ceil(cam.height / cam.zoom);
    const roomW = room.width * TILE;
    const roomH = room.height * TILE;
    // A little dark edge round the room (a tile each side) so the walls never touch the screen edge.
    const w = Math.max(roomW + TILE * 2, viewW);
    const h = Math.max(roomH + TILE * 2, viewH);
    const x = Math.round(room.ox * TILE + roomW / 2 - w / 2);
    const y = Math.round(room.oy * TILE + roomH / 2 - h / 2);
    cam.setBounds(x, y, w, h);
    cam.setBackgroundColor(this.voidColour);
    const [left, top, right, bottom] = [room.ox * TILE, room.oy * TILE, room.ox * TILE + roomW, room.oy * TILE + roomH];
    const pad = TILE * 4; // a bit past the view, in case the camera rounds a pixel outwards
    const boxes = [
      [x - pad, y - pad, w + pad * 2, top - y + pad], // above
      [x - pad, bottom, w + pad * 2, y + h - bottom + pad], // below
      [x - pad, top, left - x + pad, roomH], // left
      [right, top, x + w - right + pad, roomH] // right
    ];
    boxes.forEach(([bx, by, bw, bh], i) => this.covers[i].setPosition(bx, by).setSize(Math.max(0, bw), Math.max(0, bh)).setVisible(true));
  }

  /* ---------------- going in and out ---------------- */

  /** A tap on a house's doorway (or a room's exit) walks there and on through it. Returns the walk, or null. */
  tapWalk(x, y) {
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    if (this.current) {
      const { exit } = this.current;
      if (tx !== exit.x || ty < exit.y - 1 || ty > exit.y + 1) return null;
      return { x: exit.x * TILE + TILE / 2, y: exit.y * TILE - 2, next: { x: exit.x * TILE + TILE / 2, y: (exit.y + 1) * TILE - 1 } };
    }
    const link = this.links.find((l) => tx === l.door.x && ty >= l.door.y - 1 && ty <= l.door.y);
    if (!link) return null;
    return { x: link.outside.x, y: link.outside.y, next: { x: link.door.x * TILE + TILE / 2, y: link.door.y * TILE + DOOR_DEPTH - 4 } };
  }

  update() {
    if (this.busy) return;
    const p = this.scene.player;
    if (!p.moving) return;
    const tx = Math.floor(p.x / TILE);
    const ty = Math.floor((p.y - 1) / TILE);
    if (this.current) {
      const { exit } = this.current;
      if (tx === exit.x && ty === exit.y && p.y >= exit.y * TILE + EXIT_DEPTH) this.travel(this.current, false);
      return;
    }
    for (const link of this.links) {
      if (tx === link.door.x && ty === link.door.y && p.y <= link.door.y * TILE + DOOR_DEPTH) {
        this.travel(link, true);
        return;
      }
    }
  }

  /** Fade out, move the player (and anyone following) through the door, fade back in. */
  travel(link, goingIn) {
    const scene = this.scene;
    this.busy = true;
    scene.walkTarget = null;
    scene.useOnArrive = null;
    scene.registry.get('audio')?.play(goingIn ? 'room-in' : 'room-out', { volume: 0.7 });
    const move = () => {
      const spot = goingIn ? link.inside : link.outside;
      this.current = goingIn ? link : null;
      // Friends walking behind start in the doorway, one step back, and follow on through.
      this.placePlayer(spot.x, spot.y, goingIn ? 'up' : 'down', goingIn ? 12 : -12);
      this.applyCamera();
      scene.cameras.main.centerOn(spot.x, spot.y - 8);
      scene.player.region = goingIn ? link.room.id : link.region.id;
      scene.savePlayer();
      scene.handleOutcome(scene.session.rules.enterArea(scene.player.region, scene.ruleContext()));
    };
    const cam = scene.cameras.main;
    if (scene.effects.reduced) {
      // "Less motion": no fading, just a quick cut.
      move();
      this.busy = false;
      return;
    }
    const [r, g, b] = [(this.voidColour >> 16) & 255, (this.voidColour >> 8) & 255, this.voidColour & 255];
    cam.fadeOut(FADE_MS, r, g, b);
    cam.once('camerafadeoutcomplete', () => {
      move();
      cam.fadeIn(FADE_MS, r, g, b);
      cam.once('camerafadeincomplete', () => { this.busy = false; });
    });
  }

  /** Put the player on a spot, standing still and facing a way; friends walking behind come along (`behind` pixels below). */
  placePlayer(x, y, facing, behind = 0) {
    const scene = this.scene;
    const p = scene.player;
    p.x = x;
    p.y = y;
    p.facing = facing;
    p.moving = false;
    scene.playerSprite.stop();
    scene.playerSprite.setPosition(x, y).setDepth(y);
    scene.faceStill?.(facing);
    scene.trail = behind ? [{ x, y: y + behind }, { x, y }] : [];
    for (const npc of scene.npcs || []) {
      const follower = npc.creature;
      if (!follower?.guide) continue;
      follower.x = x;
      follower.y = y + (behind || 1);
      follower.sprite.setPosition(follower.x, follower.y).setDepth(follower.y);
    }
  }
}
