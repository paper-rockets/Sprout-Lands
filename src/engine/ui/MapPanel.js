import { Modal } from './Modal.js';
import { UiButton, uiBox, uiText } from './widgets.js';
import { fillBlanks, portraitFor, words } from './theme.js';
import { F, TILE } from '../world/worldModel.js';

// Map colours, picked from the Sprout Lands palette.
const COLORS = {
  water: '#9bd4c3',
  grass: '#bcd66f',
  dark: '#a3c25f',
  hill: '#9cbb5a',
  sand: '#e8cfa6',
  snow: '#f3f4e7',
  forest: '#7fa884',
  fence: '#aa7959',
  bridge: '#aa7959',
  stones: '#c49a6c',
  tree: '#6f9a5e',
  house: '#aa7959',
  small: '#90625d',
  rock: '#8a9192',
  crop: '#d6a94a'
};

const OBJECT_KIND = [
  [/^(tree|pine|blossom|hw_(dead_tree|face_tree|tree))/, 'tree', 1],
  [/^(house|hut|school|coop|hw_(haunted_house|witch_cottage|pumpkin_house|crypt))/, 'house', 3],
  [/^crop_/, 'crop', 1],
  [/^(rock|boulder|water_rock)/, 'rock', 1],
  [/^(well|sign|chest|beehive|boat)/, 'small', 1]
];

// Little dots for the wandering animals: a light middle so they show up on any ground.
const DOT_FILL = 0xf3f4e7;
const DOT_EDGE = 0x6b4b5b;
const SUPERSAMPLE = 3; // the map picture is painted this many times finer than it is shown
const FRAME = 4; // the tan frame around the picture
const PIN = 16;

// Ground kinds for the smooth map: 0 is water, then the land types. SHALLOW and FOAM are only colours.
const GROUND_RGB = ['#9bd4c3', '#bcd66f', '#a3c25f', '#e8cfa6', '#7fa884', '#f3f4e7', '#9cbb5a', '#b6dccb', '#eef7ea'];
const SHALLOW = 7;
const FOAM = 8;
// A region's own map colours (region JSON "mapColors") replace these ground kinds inside it.
const KIND_NAMES = { grass: 1, dark: 2, sand: 3, forest: 4, snow: 5, hill: 6 };

function hexToRgb(hex) {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

function groundKind(flags) {
  if (!(flags & F.LAND)) return 0;
  if (flags & F.HEDGE) return 4;
  if (flags & F.SNOW) return 5;
  if (flags & F.SAND) return 3;
  if (flags & F.HILL) return 6;
  if (flags & F.DARK) return 2;
  return 1;
}

/** How big the map can be drawn: whole pixels per tile, and the panel that goes around it. */
function measure(ui, world) {
  const b = world.outdoor;
  const maxW = Math.min(ui.uiW - 16, 400) - 24 - FRAME * 2;
  const maxH = Math.min(ui.uiH - 12, 230) - 62 - FRAME * 2;
  // Whole or half pixels per tile (a half step keeps a wide world from dropping to half size).
  const scale = Math.max(1, Math.floor(Math.min(maxW / b.width, maxH / b.height) * 2) / 2);
  return { bounds: b, scale, width: Math.max(200, b.width * scale + 24 + FRAME * 2), height: b.height * scale + 62 + FRAME * 2 };
}

/**
 * A small picture of the whole world in a frame. The player's own face bobs where they are,
 * the wandering animals are tiny moving dots, and named places have pins. Tap a pin to read its name.
 */
export class MapPanel extends Modal {
  constructor(ui, opts = {}) {
    const world = ui.registry.get('world');
    const m = measure(ui, world);
    super(ui, { width: m.width, height: m.height, title: words(ui, 'map.title'), accent: 'blue', mascots: [{ kind: 'frog', color: 1, anim: 'tongue', x: m.width - 22, y: 4 }], ...opts });
    const { bounds, scale } = m;
    this.scale = scale;
    this.bounds = bounds;
    this.colors = ui.content.art.ui.colors;
    const mapW = bounds.width * scale;
    const mapH = bounds.height * scale;
    this.left = Math.floor((m.width - mapW) / 2);
    this.top = 27 + FRAME;
    this.overworld = ui.scene.get('overworld');

    this.root.add(uiBox(ui, 'slotTan', this.left - FRAME, this.top - FRAME, mapW + FRAME * 2, mapH + FRAME * 2));
    this.textureKey = `map-picture-v2-${scale}`;
    if (!ui.textures.exists(this.textureKey)) this.paint(ui, world, bounds, scale);
    this.root.add(ui.add.image(this.left, this.top, this.textureKey).setOrigin(0, 0).setDisplaySize(mapW, mapH));

    this.addDots(ui);
    this.addPins(ui, world);
    this.addHelpPins(ui);
    this.addPlayer(ui);

    // The line under the map: "You are here" until a pin is tapped.
    this.captionY = this.top + mapH + FRAME + 6;
    this.caption = uiText(ui, 0, this.captionY, '', { color: this.colors.ink });
    this.captionIcon = ui.add.image(0, this.captionY - 4, 'ui-icons', 0).setOrigin(0, 0);
    this.root.add([this.caption, this.captionIcon]);
    this.setCaption(words(ui, 'map.here'), this.player);

    this.ok = new UiButton(ui, m.width - 14 - 30, m.height - 30, { label: words(ui, 'settings.close'), selectedMark: false, onPress: () => this.close() });
    this.ok.setX(m.width - 12 - this.ok.bw);
    this.ok.setY(m.height - 12 - this.ok.bh);
    this.root.add(this.ok);
    this.setFocusRows([[this.ok]]);
  }

  /** Screen position (panel coordinates) of the middle of a world tile. */
  spot(tx, ty) {
    return [this.left + (tx - this.bounds.x + 0.5) * this.scale, this.top + (ty - this.bounds.y + 0.5) * this.scale];
  }

  addDots(ui) {
    this.dots = [];
    for (const creature of this.overworld.creatures?.creatures || []) {
      const dot = ui.add.rectangle(0, 0, 2, 2, DOT_FILL).setStrokeStyle(1, DOT_EDGE);
      this.root.add(dot);
      this.dots.push({ dot, creature });
    }
    this.moveDots();
  }

  moveDots() {
    for (const { dot, creature } of this.dots) {
      const at = this.overworld.mapPosition?.(creature.sprite.x, creature.sprite.y) || creature.sprite;
      const [x, y] = this.spot(at.x / TILE - 0.5, at.y / TILE - 0.5);
      dot.setPosition(Math.round(x), Math.round(y));
    }
  }

  addPins(ui, world) {
    const icons = ui.content.art.ui.mapIcons || {};
    for (const region of world.regions) {
      for (const place of region.landmarks || []) {
        const frame = icons[place.icon];
        if (frame === undefined) continue;
        const [x, y] = this.spot(region.ox + place.at[0], region.oy + place.at[1]);
        // A small round tan disc behind the icon keeps it readable on any ground.
        const disc = ui.add.circle(Math.round(x), Math.round(y), 7, 0xe8cfa6).setStrokeStyle(1, 0x90625d);
        const icon = ui.add.image(Math.round(x), Math.round(y), 'ui-icons', frame).setDisplaySize(PIN - 4, PIN - 4);
        const hit = ui.add.zone(Math.round(x), Math.round(y), 22, 22).setInteractive({ useHandCursor: true });
        hit.on('pointerdown', () => {
          ui.registry.get('audio')?.play('tap', { volume: 0.5 });
          this.setCaption(place.name, { frame });
        });
        this.root.add([disc, icon, hit]);
      }
    }
  }

  /**
   * Where to go next: a bobbing "!" over everyone waiting to give a quest, and while friends
   * are being walked home, a pin where home is. Tap one to read who it is.
   */
  addHelpPins(ui) {
    const icons = ui.content.art.ui.mapIcons || {};
    const rules = ui.session.rules;
    const pins = [];
    for (const npc of this.overworld.npcs || []) {
      if (npc.emote !== 'exclaim' || npc.hidden) continue;
      pins.push({ x: npc.sprite.x, y: npc.sprite.y, icon: 'exclaim', text: fillBlanks(words(ui, 'map.needsHelp'), { who: rules.entityName(npc.def.id) }) });
    }
    for (const questId of Object.keys(rules.state.quests)) {
      const step = rules.currentStep(questId);
      if (step?.type !== 'escort' || !step.to || rules.followersWithTag(step.tag).length === 0) continue;
      const target = this.overworld.npcs.find((n) => n.def.id === step.to);
      if (target) pins.push({ x: target.sprite.x, y: target.sprite.y, icon: 'home', text: rules.stepText(step) });
    }
    for (const pin of pins) {
      const frame = icons[pin.icon];
      if (frame === undefined) continue;
      const [x, y] = this.spot(pin.x / TILE - 0.5, pin.y / TILE - 0.5);
      const box = ui.add.container(Math.round(x), Math.round(y) - 9);
      box.add(ui.add.circle(0, 0, 8, 0xfff3c4).setStrokeStyle(1, 0xc0703a));
      box.add(ui.add.image(0, 0, 'ui-icons', frame).setDisplaySize(PIN - 2, PIN - 2));
      const hit = ui.add.zone(Math.round(x), Math.round(y) - 9, 22, 22).setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => {
        ui.registry.get('audio')?.play('tap', { volume: 0.5 });
        this.setCaption(pin.text.toUpperCase(), { frame });
      });
      this.root.add([box, hit]);
      if (!ui.session.settings.reducedMotion) {
        this.helpBobs = this.helpBobs || [];
        this.helpBobs.push(ui.tweens.add({ targets: box, y: box.y - 3, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));
      }
    }
  }

  /** The player's own face, bobbing where they stand. */
  addPlayer(ui) {
    const at = this.overworld.mapPosition?.() || this.overworld.player; // inside a house: at its door
    const [x, y] = this.spot(at.x / TILE - 0.5, at.y / TILE - 0.5);
    const face = portraitFor(ui, ui.session.state.profile.avatarId);
    this.player = { tex: face?.tex, frame: face?.frame };
    const ring = ui.add.circle(Math.round(x), Math.round(y) - 8, 9, 0xf3f4e7).setStrokeStyle(1, 0x6b4b5b);
    this.marker = ui.add.container(Math.round(x), Math.round(y) - 8);
    const photo = ui.photoKey();
    if (photo) this.marker.add(ui.add.image(0, 0, photo).setDisplaySize(16, 16));
    else if (face) this.marker.add(ui.add.image(0, 0, face.tex, face.frame).setDisplaySize(16, 16));
    this.root.add([ring, this.marker]);
    this.ring = ring;
    if (!ui.session.settings.reducedMotion) {
      this.bounce = ui.tweens.add({ targets: [this.marker, ring], y: this.marker.y - 3, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  /** Change the line under the map, with a small picture at its left (a { frame } icon or the player's face). */
  setCaption(text, icon) {
    this.caption.setText(text);
    const w = this.caption.width;
    const x = Math.floor((this.width - w) / 2) - 8;
    this.caption.setX(x);
    this.captionIcon.setPosition(x - 18, this.captionY - 4);
    if (icon?.tex) this.captionIcon.setTexture(icon.tex, icon.frame).setDisplaySize(16, 16);
    else this.captionIcon.setTexture('ui-icons', icon.frame).setDisplaySize(16, 16);
  }

  update() {
    this.moveDots();
  }

  /**
   * Paint the world into a picture. It is drawn 3 times finer than the screen needs and shrunk back
   * with smoothing, and the coast and ground patches are rounded off, so nothing looks like big squares.
   */
  paint(ui, world, bounds, scale) {
    const S = Number.isInteger(scale) ? SUPERSAMPLE : SUPERSAMPLE + 1;
    const per = scale * S; // picture pixels per tile (a whole number: half scales use 4x)
    const W = bounds.width;
    const H = bounds.height;
    const pw = W * per;
    const ph = H * per;
    const texture = ui.textures.createCanvas(this.textureKey, pw, ph);
    const ctx = texture.getContext();

    // What kind of ground each tile is (bridges and stones count as water here; they are drawn crisply later).
    const palette = [...GROUND_RGB];
    const swaps = new Map(); // region -> { base kind: palette index }
    for (const region of world.regions) {
      if (!region.mapColors) continue;
      const swap = {};
      for (const [name, hex] of Object.entries(region.mapColors)) {
        if (KIND_NAMES[name] === undefined) continue;
        swap[KIND_NAMES[name]] = palette.length;
        palette.push(hex);
      }
      swaps.set(region, swap);
    }
    const kind = new Uint8Array(W * H);
    for (let y = 0; y < H; y += 1) {
      for (let x = 0; x < W; x += 1) {
        const k = groundKind(world.get(bounds.x + x, bounds.y + y));
        const swap = k ? swaps.get(world.regionAt(bounds.x + x, bounds.y + y)) : null;
        kind[y * W + x] = swap?.[k] ?? k;
      }
    }
    const rgb = palette.map(hexToRgb);
    const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : kind[y * W + x]);

    const image = ctx.createImageData(pw, ph);
    const data = image.data;
    const weight = new Float32Array(palette.length);
    for (let py = 0; py < ph; py += 1) {
      const fy = (py + 0.5) / per - 0.5;
      const y0 = Math.floor(fy);
      const ty = fy - y0;
      for (let px = 0; px < pw; px += 1) {
        const fx = (px + 0.5) / per - 0.5;
        const x0 = Math.floor(fx);
        const tx = fx - x0;
        weight.fill(0);
        weight[at(x0, y0)] += (1 - tx) * (1 - ty);
        weight[at(x0 + 1, y0)] += tx * (1 - ty);
        weight[at(x0, y0 + 1)] += (1 - tx) * ty;
        weight[at(x0 + 1, y0 + 1)] += tx * ty;
        const land = 1 - weight[0];
        let color;
        if (land < 0.5) {
          color = land > 0.32 ? rgb[SHALLOW] : rgb[0];
        } else if (land < 0.62) {
          color = rgb[FOAM];
        } else {
          let best = 1;
          for (let k = 2; k < palette.length; k += 1) if (weight[k] > weight[best]) best = k;
          color = rgb[best];
        }
        const i = (py * pw + px) * 4;
        data[i] = color[0];
        data[i + 1] = color[1];
        data[i + 2] = color[2];
        data[i + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);

    // Bridges and stepping stones.
    for (let y = 0; y < H; y += 1) {
      for (let x = 0; x < W; x += 1) {
        const flags = world.get(bounds.x + x, bounds.y + y);
        if (flags & (F.BRIDGE_H | F.BRIDGE_V)) {
          ctx.fillStyle = COLORS.bridge;
          if (flags & F.BRIDGE_H) ctx.fillRect(x * per, y * per + per * 0.2, per, per * 0.6);
          else ctx.fillRect(x * per + per * 0.2, y * per, per * 0.6, per);
        } else if (flags & F.STONES) {
          ctx.fillStyle = COLORS.stones;
          ctx.beginPath();
          ctx.arc((x + 0.5) * per, (y + 0.5) * per, per * 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Trees, houses, rocks and crops.
    const art = ui.content.art.objects;
    for (const region of world.regions) {
      for (const obj of region.objects || []) {
        const objKind = OBJECT_KIND.find(([pattern]) => pattern.test(obj.type));
        if (!objKind || !art[obj.type]) continue;
        const [, color, size] = objKind;
        const cx = (region.ox + obj.at[0] - bounds.x + 0.5) * per;
        const cy = (region.oy + obj.at[1] - bounds.y + 0.5) * per;
        ctx.fillStyle = COLORS[color];
        if (size === 3) {
          ctx.fillRect(cx - 1.5 * per, cy - 2.5 * per, 3 * per, 3 * per);
        } else {
          ctx.beginPath();
          ctx.arc(cx, cy, per * (color === 'tree' ? 0.75 : 0.5), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    texture.refresh();
    texture.setFilter(0); // smooth (linear) when shrunk, so the finer picture actually looks finer
  }

  close() {
    this.bounce?.stop();
    for (const bob of this.helpBobs || []) bob.stop();
    super.close();
  }
}
