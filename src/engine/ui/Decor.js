/**
 * Decorations that make the plain wooden panels feel like part of the garden:
 * a coloured title plaque with a little sprout on each side, and a border of
 * flowers, grass and mushrooms growing along the bottom edge.
 * The same panel always gets the same flowers (they are picked by its size),
 * so nothing jumps around when the window changes.
 */

import { fontSafe, rectFrame, uiArt } from './theme.js';
import { uiBox, uiText } from './widgets.js';

/** Soft colours for title plaques. The plaque art is tan, so these are multiplied over it. */
export const ACCENTS = {
  brown: 0xffffff,
  green: 0xcdeaa0,
  blue: 0xb4dcf5,
  pink: 0xf6bccf,
  gold: 0xffe89a,
  purple: 0xd7c4f0
};

// Small growing things for the garden border (names from art.json objects).
const GARDEN = ['flower_yellow', 'flower_pink', 'tuft', 'flower_blue', 'daisy', 'mushroom_red', 'flower_white', 'tuft_big', 'flower_pink', 'lavender', 'flower_yellow', 'mushroom_purple', 'bluebell', 'flower_white'];

function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** A title plaque centred on the top edge of a panel, with a sprout at each end. Returns the container. */
export function addPlaque(scene, parent, panelWidth, title, accent = 'brown') {
  const label = uiText(scene, 0, 0, fontSafe(title), { font: 'big', color: uiArt(scene).colors.title, shadow: uiArt(scene).colors.titleShadow });
  const w = Math.max(70, Math.ceil(label.width) + 30);
  const plaque = scene.add.container(Math.floor((panelWidth - w) / 2), -9);
  const box = uiBox(scene, 'button', 0, 0, w, 24);
  box.setTint(ACCENTS[accent] ?? ACCENTS.brown);
  label.setPosition(Math.floor((w - label.width) / 2), 5);
  plaque.add([box, label]);
  // A little planted sprout at each end (from the portrait-frame sheet).
  const sprout = uiArt(scene).pieces.sprout;
  if (sprout) {
    const frame = rectFrame(scene, sprout.tex, sprout.rect);
    plaque.add(scene.add.image(-11, 9, sprout.tex, frame).setOrigin(0, 0));
    plaque.add(scene.add.image(w - 1, 9, sprout.tex, frame).setOrigin(0, 0).setFlipX(true));
  }
  parent.add(plaque);
  return plaque;
}

/** Flowers and grass growing along the bottom edge of a panel, with taller plants in the corners. */
export function addGarden(scene, parent, panelWidth, panelHeight) {
  const defs = scene.registry.get('content').art.objects;
  const random = seededRandom(panelWidth * 31 + panelHeight * 17);
  const layer = scene.add.container(0, 0);
  const plant = (name, x, bottom, flip = false) => {
    const def = defs[name];
    if (!def || !def.rect) return;
    const image = scene.add.image(Math.round(x), bottom, def.tex, rectFrame(scene, def.tex, def.rect)).setOrigin(0.5, 1);
    if (flip) image.setFlipX(true);
    layer.add(image);
  };
  const bottom = panelHeight + 5;
  const count = Math.max(4, Math.floor(panelWidth / 24));
  const spacing = panelWidth / count;
  for (let i = 0; i < count; i += 1) {
    const name = GARDEN[Math.floor(random() * GARDEN.length)];
    plant(name, spacing * (i + 0.5) + (random() - 0.5) * spacing * 0.6, bottom - Math.round(random() * 2), random() < 0.5);
  }
  // Taller things in the corners.
  plant('sunflower', 9, bottom + 1);
  plant('bush_cat_pink', panelWidth - 10, bottom);
  plant('tuft_big', 22, bottom);
  plant('flower_pink', panelWidth - 24, bottom);
  // A few little tufts peeking over the top edge, either side of the plaque.
  plant('tuft', 10, 4);
  plant('flower_yellow', panelWidth - 10, 5);
  parent.add(layer);
  return layer;
}

/**
 * A small animal sitting on the panel, sharing the screen with the player.
 * `spec` is { kind: 'hen', color: 0, anim: 'idle', x, y, flip } in panel coordinates, y being its feet.
 * Animals use the same pictures as the wandering ones in the world (art.json creatures).
 */
export function addMascot(scene, parent, spec) {
  const creatures = scene.registry.get('content').art.creatures;
  const def = creatures[spec.kind];
  if (!def) return null;
  const tex = def.textures[Math.min(spec.color || 0, def.textures.length - 1)];
  const sprite = scene.add.sprite(Math.round(spec.x), Math.round(spec.y), tex, 0).setOrigin(0.5, 1);
  const key = `${tex}:${spec.anim || 'idle'}`;
  if (scene.anims.exists(key) && !scene.session.settings.reducedMotion) sprite.play(key);
  if (spec.flip) sprite.setFlipX(true);
  parent.add(sprite);
  return sprite;
}

/** The player's chosen friend, marching on the spot. */
export function addHero(scene, parent, x, y, facing = 'down') {
  const texture = scene.session.playerTexture();
  if (!texture) return null;
  const sprite = scene.add.sprite(Math.round(x), Math.round(y), texture, 12).setOrigin(0.5, 1);
  sprite.setScale(32 / (scene.registry.get('content').art.textures[texture]?.frame?.[0] || 32));
  const key = `${texture}-walk-${facing}`;
  if (scene.anims.exists(key) && !scene.session.settings.reducedMotion) sprite.play(key);
  parent.add(sprite);
  return sprite;
}
