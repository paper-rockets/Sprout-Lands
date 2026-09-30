import { Modal } from './Modal.js';
import { ItemTile, TILE_SIZE } from './ItemTile.js';
import { UiButton, uiText } from './widgets.js';
import { iconFor, piece, words } from './theme.js';
import * as Kitchen from '../rules/Kitchen.js';

const WIDTH = 300;
const HEIGHT = 166;
const GRID_X = 14;
const GRID_Y = 22;
const COLUMNS = 5;
const STEP = TILE_SIZE + 2;
const RIGHT_X = 160;

/** Shared by the cooking and shop screens: an item's name, and a bag group's picture and name. */
export function itemName(ui, id) {
  return ui.content.art.items[id]?.name || id;
}

export function groupIcon(ui, group) {
  const entry = (ui.content.art.itemBar || []).find((b) => b.group === group);
  return entry ? iconFor(ui, entry.icon) : null;
}

export function groupName(ui, group) {
  return ui.content.strings?.[`group.${group}`] || group;
}

/** Show what the rules decided (save, sounds, the item bar's little jump), like the game world does. */
export function applyOutcome(ui, out) {
  const session = ui.session;
  if (out.changed) session.change(() => {});
  const audio = ui.registry.get('audio');
  for (const id of new Set(out.sounds)) audio?.play(id);
  for (const gain of out.gained || []) session.events.emit('gained', gain);
}

/** A picture that jumps (not with "less motion"). */
export function bounce(ui, target) {
  if (!target || ui.session.settings.reducedMotion) return;
  ui.tweens.add({ targets: target, scale: { from: 2.5, to: 2 }, duration: 260, ease: 'Back.easeOut' });
}

/**
 * The oven: every recipe as a picture of what it makes (greyed out while something is missing).
 * Picking one shows its big picture, what it needs (have / need for each thing) and a Cook button.
 * Cooking uses the things up and puts the food in the bag (rules in engine/rules/Kitchen.js).
 */
export class CookPanel extends Modal {
  constructor(ui, opts = {}) {
    super(ui, { width: WIDTH, height: HEIGHT, title: words(ui, 'cook.title'), accent: 'gold', ...opts });
    this.recipes = Kitchen.recipes(ui.content);
    this.colors = ui.content.art.ui.colors;
    this.index = 0;

    this.tiles = this.recipes.map((r, i) => {
      const tile = new ItemTile(ui, GRID_X + (i % COLUMNS) * STEP, GRID_Y + Math.floor(i / COLUMNS) * STEP, iconFor(ui, r.makes), () => this.select(i));
      this.root.add(tile);
      return tile;
    });
    const gridBottom = GRID_Y + Math.ceil(this.recipes.length / COLUMNS) * STEP;
    this.message = uiText(ui, GRID_X, gridBottom + 6, words(ui, 'cook.pick'), { color: this.colors.ink, wrap: RIGHT_X - GRID_X - 10 });
    this.root.add(this.message);

    const frame = piece(ui, 'portraitFrame');
    this.root.add(ui.add.image(RIGHT_X, 20, frame.tex, frame.frame).setOrigin(0, 0));
    this.big = ui.add.image(RIGHT_X + 29, 48, 'ui-icons', 0).setScale(2).setVisible(false);
    this.name = uiText(ui, RIGHT_X + 64, 26, '', { color: this.colors.ink, wrap: WIDTH - RIGHT_X - 76 });
    this.have = uiText(ui, RIGHT_X + 64, 56, '', { color: this.colors.inkSoft, wrap: WIDTH - RIGHT_X - 76 });
    this.root.add([this.big, this.name, this.have]);
    this.needs = ui.add.container(0, 0);
    this.root.add(this.needs);

    this.cookButton = new UiButton(ui, RIGHT_X, 104, { label: words(ui, 'cook.button'), selectedMark: false, width: 64, onPress: () => this.cook() });
    this.ok = new UiButton(ui, 0, HEIGHT - 30, { label: words(ui, 'settings.close'), selectedMark: false, onPress: () => this.close() });
    this.ok.setX(Math.floor((WIDTH - this.ok.bw) / 2));
    this.root.add([this.cookButton, this.ok]);

    const rows = [];
    for (let i = 0; i < this.tiles.length; i += COLUMNS) rows.push(this.tiles.slice(i, i + COLUMNS));
    this.setFocusRows([...rows, [this.cookButton], [this.ok]]);
    // Start on the first recipe the player can already make.
    const ready = this.recipes.findIndex((r) => this.plan(r).ok);
    this.select(ready >= 0 ? ready : 0, true);
  }

  plan(recipe) {
    return Kitchen.plan(this.ui.content, this.ui.session.state.bag, recipe);
  }

  select(index, quiet = false) {
    const recipe = this.recipes[index];
    if (!recipe) return;
    this.index = index;
    this.tiles.forEach((tile, i) => tile.setSelected(i === index));
    if (!quiet) this.message.setText(words(this.ui, 'cook.pick'));
    this.render();
  }

  /** The big picture, name and "needs" row of the picked recipe; greys out what cannot be cooked yet. */
  render() {
    const ui = this.ui;
    const bag = ui.session.state.bag;
    this.recipes.forEach((r, i) => this.tiles[i].setDim(!this.plan(r).ok).setBadge(bag[r.makes] || ''));
    const recipe = this.recipes[this.index];
    if (!recipe) return;
    const icon = iconFor(ui, recipe.makes);
    if (icon) this.big.setTexture(icon.tex, icon.frame).setVisible(true);
    this.name.setText(itemName(ui, recipe.makes));
    this.have.setText(words(ui, 'cook.have', { n: bag[recipe.makes] || 0 }));
    this.needs.removeAll(true);
    this.needs.add(uiText(ui, RIGHT_X, 84, words(ui, 'cook.needs'), { color: this.colors.inkSoft }));
    const plan = this.plan(recipe);
    let x = RIGHT_X + 38;
    for (const part of plan.parts) {
      const pic = part.need.item ? iconFor(ui, part.need.item) : groupIcon(ui, part.need.group);
      const short = part.have < part.count;
      if (pic) this.needs.add(ui.add.image(x, 80, pic.tex, pic.frame).setOrigin(0, 0).setAlpha(short ? 0.45 : 1));
      const count = uiText(ui, x + 17, 84, `${Math.min(part.have, part.count)}/${part.count}`, { color: short ? this.colors.inkSoft : this.colors.ink });
      this.needs.add(count);
      x += 17 + Math.ceil(count.width) + 6;
    }
    this.cookButton.setAlpha(plan.ok ? 1 : 0.6);
  }

  cook() {
    const ui = this.ui;
    const recipe = this.recipes[this.index];
    if (!recipe) return;
    const out = ui.session.rules.cook(recipe.id);
    applyOutcome(ui, out);
    if (out.result.ok) {
      this.message.setText(words(ui, 'cook.made', { item: itemName(ui, out.result.made) }));
      bounce(ui, this.big);
    } else {
      const missing = (out.result.parts || []).filter((p) => p.have < p.count)
        .map((p) => (p.need.item ? itemName(ui, p.need.item) : groupName(ui, p.need.group)));
      this.message.setText(words(ui, 'cook.missing', { what: missing.join(', ') }));
    }
    this.render();
  }
}
