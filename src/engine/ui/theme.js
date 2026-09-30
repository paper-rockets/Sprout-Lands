/**
 * Shared look-up helpers for the game's menus, buttons and speech boxes.
 * All sizes are in "UI pixels": one pixel of the Sprout Lands UI art. The UI
 * camera scales them up by a whole number so the pixel art stays sharp.
 */

/**
 * How many screen pixels one UI pixel uses.
 * At least 2 (so buttons are big enough for fingers), at most 4, and never so
 * big that the largest panel (about 320 x 170) stops fitting on the screen.
 */
export function uiScaleFor(width, height) {
  const fitMax = Math.floor(Math.min(width / 320, height / 170));
  let scale = Math.round(Math.min(width / 480, height / 270));
  scale = Math.max(2, scale);
  scale = Math.min(scale, fitMax, 4);
  return Math.max(1, scale);
}

export function uiArt(scene) {
  return scene.registry.get('content').art.ui;
}

/** A texture frame for a rectangle cut out of a sheet (made once, then reused). */
export function rectFrame(scene, tex, rect) {
  const texture = scene.textures.get(tex);
  const name = `rect:${rect.join(',')}`;
  if (!texture.has(name)) texture.add(name, 0, rect[0], rect[1], rect[2], rect[3]);
  return name;
}

/** Texture + frame for an art.json item (a frame of a sheet, or a "rect" cut out of one). */
export function itemPicture(scene, item) {
  return { tex: item.tex, frame: item.rect ? rectFrame(scene, item.tex, item.rect) : item.frame };
}

/** Texture + frame for an art.json "pieces" entry. */
export function piece(scene, name) {
  const def = uiArt(scene).pieces[name];
  if (!def) throw new Error(`art.json ui.pieces has no "${name}"`);
  return { tex: def.tex, frame: def.rect ? rectFrame(scene, def.tex, def.rect) : def.frame };
}

/** Wording from text/strings.json, with {name}-style blanks filled in. */
export function words(scene, key, vars = {}) {
  const content = scene.registry.get('content');
  const template = content.strings?.[key] ?? key;
  return fillBlanks(template, vars);
}

export function fillBlanks(template, vars = {}) {
  return String(template).replace(/\{(\w+)\}/g, (all, key) => (key in vars ? String(vars[key]) : all));
}

/**
 * The picture for a speaker's face. `key` is a character id (its standing pose facing you)
 * or a picture key from art.json such as "animal-hen" (its first frame). Returns null if unknown.
 */
export function portraitFor(scene, key) {
  if (!key) return null;
  const content = scene.registry.get('content');
  const ch = content.characters[key];
  if (ch?.texture) return { tex: ch.texture, frame: 12 };
  if (content.art.textures[key]) return { tex: key, frame: 0 };
  return null;
}

/** Characters the Sprout pixel font can draw; anything else is swapped for a close match or dropped. */
const FONT_CHARS = new Set(' !"\'()*+,-./0123456789:;<=>?ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz\n');
const SWAPS = { '’': "'", '‘': "'", '“': '"', '”': '"', '—': '-', '–': '-', '…': '...', '&': '+' };

export function fontSafe(value) {
  let out = '';
  for (const ch of String(value)) {
    if (FONT_CHARS.has(ch)) out += ch;
    else if (SWAPS[ch]) out += SWAPS[ch];
    else {
      const plain = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (plain.length === 1 && FONT_CHARS.has(plain)) out += plain;
    }
  }
  return out;
}

/**
 * A small picture for an icon name: a collectible item (from art.json items), or a picture
 * key such as "animal-chick" (its first frame). Returns { tex, frame } or null.
 */
export function iconFor(scene, key) {
  if (!key) return null;
  const art = scene.registry.get('content').art;
  const item = art.items?.[key];
  if (item) return itemPicture(scene, item); // pictures cut by "rect" too (the picnic foods)
  if (art.textures[key]) return { tex: key, frame: 0 };
  return portraitFor(scene, key);
}
