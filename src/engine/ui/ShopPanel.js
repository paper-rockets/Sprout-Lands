import { Modal } from './Modal.js';
import { ItemTile, TILE_SIZE } from './ItemTile.js';
import { UiButton, uiText } from './widgets.js';
import { iconFor, piece, words } from './theme.js';
import { applyOutcome, bounce, itemName } from './CookPanel.js';
import * as Kitchen from '../rules/Kitchen.js';

const WIDTH = 300;
const HEIGHT = 166;
const GRID_X = 14;
const GRID_Y = 48;
const COLUMNS = 5;
const ROWS = 3;
const STEP = TILE_SIZE + 2;
const RIGHT_X = 160;

/**
 * A shop counter. "Buy": what the shop sells, each with its price. "Sell": everything in your bag the
 * shop will buy, with how many you have. Pick one to see its picture and price (with the coin picture),
 * then press Buy or Sell. Coins never go below zero (rules in engine/rules/Kitchen.js).
 * The shop comes from cooking.json "shops"; the counter in the room names it ("shop": "bakery").
 */
export class ShopPanel extends Modal {
  constructor(ui, opts = {}) {
    const shops = ui.content.cooking?.shops || {};
    const shopId = opts.data?.shop && shops[opts.data.shop] ? opts.data.shop : Object.keys(shops)[0];
    const shop = shops[shopId] || { name: '', sells: [], buys: [] };
    super(ui, { width: WIDTH, height: HEIGHT, title: shop.name || words(ui, 'shop.title'), accent: 'pink', ...opts });
    this.shopId = shopId;
    this.shop = shop;
    this.colors = ui.content.art.ui.colors;
    this.mode = 'buy';
    this.page = 0;
    this.picked = null;

    this.buyTab = new UiButton(ui, GRID_X, 20, { label: words(ui, 'shop.buy'), selected: true, onPress: () => this.setMode('buy') });
    this.sellTab = new UiButton(ui, GRID_X + this.buyTab.bw + 4, 20, { label: words(ui, 'shop.sell'), onPress: () => this.setMode('sell') });
    this.root.add([this.buyTab, this.sellTab]);

    // Your coins, top right of the list.
    const coin = piece(ui, 'coin');
    this.root.add(ui.add.image(RIGHT_X - 44, 22, coin.tex, coin.frame).setOrigin(0, 0));
    this.coins = uiText(ui, RIGHT_X - 26, 27, '', { color: this.colors.ink });
    this.root.add(this.coins);

    this.grid = ui.add.container(0, 0);
    this.root.add(this.grid);
    this.more = new UiButton(ui, GRID_X + (COLUMNS - 1) * STEP + 2, GRID_Y + (ROWS - 1) * STEP + 1, { icon: 'right', onPress: () => this.nextPage() });
    this.root.add(this.more);

    const frame = piece(ui, 'portraitFrame');
    this.root.add(ui.add.image(RIGHT_X, 20, frame.tex, frame.frame).setOrigin(0, 0));
    this.big = ui.add.image(RIGHT_X + 29, 48, 'ui-icons', 0).setScale(2).setVisible(false);
    this.name = uiText(ui, RIGHT_X + 64, 26, '', { color: this.colors.ink, wrap: WIDTH - RIGHT_X - 76 });
    this.have = uiText(ui, RIGHT_X + 64, 56, '', { color: this.colors.inkSoft, wrap: WIDTH - RIGHT_X - 76 });
    this.priceCoin = ui.add.image(RIGHT_X, 80, coin.tex, coin.frame).setOrigin(0, 0).setVisible(false);
    this.price = uiText(ui, RIGHT_X + 18, 85, '', { color: this.colors.ink });
    this.message = uiText(ui, RIGHT_X, 126, '', { color: this.colors.ink, wrap: WIDTH - RIGHT_X - 12 });
    this.root.add([this.big, this.name, this.have, this.priceCoin, this.price, this.message]);

    this.action = new UiButton(ui, RIGHT_X, 100, { label: words(ui, 'shop.buy'), selectedMark: false, width: 64, onPress: () => this.trade() });
    this.ok = new UiButton(ui, 0, HEIGHT - 30, { label: words(ui, 'settings.close'), selectedMark: false, onPress: () => this.close() });
    this.ok.setX(Math.floor((WIDTH - this.ok.bw) / 2));
    this.root.add([this.action, this.ok]);
    this.render();
  }

  /** What the list shows: [{ item, price, have }]. */
  entries() {
    const state = this.ui.session.state;
    if (this.mode === 'buy') return (this.shop.sells || []).map((s) => ({ item: s.item, price: s.price, have: state.bag[s.item] || 0 }));
    return Kitchen.sellable(this.ui.content, state, this.shopId);
  }

  setMode(mode) {
    if (mode === this.mode) return;
    this.mode = mode;
    this.page = 0;
    this.picked = null;
    this.message.setText('');
    this.buyTab.setSelected(mode === 'buy');
    this.sellTab.setSelected(mode === 'sell');
    this.render();
  }

  nextPage() {
    this.page += 1;
    this.render();
  }

  /** Rebuild the list, the picked item's details and the keyboard rows. */
  render() {
    const ui = this.ui;
    const state = ui.session.state;
    this.coins.setText(String(state.coins));
    const all = this.entries();
    const perPage = all.length > COLUMNS * ROWS ? COLUMNS * ROWS - 1 : COLUMNS * ROWS; // the last square becomes "more"
    const pages = Math.max(1, Math.ceil(all.length / perPage));
    this.page %= pages;
    const shown = all.slice(this.page * perPage, (this.page + 1) * perPage);
    this.more.setVisible(pages > 1);
    if (!all.some((e) => e.item === this.picked)) this.picked = shown[0]?.item || null;

    this.grid.removeAll(true);
    this.tiles = shown.map((entry, i) => {
      const tile = new ItemTile(ui, GRID_X + (i % COLUMNS) * STEP, GRID_Y + Math.floor(i / COLUMNS) * STEP, iconFor(ui, entry.item), () => this.pick(entry.item));
      tile.item = entry.item;
      tile.setBadge(this.mode === 'buy' ? entry.price : entry.have);
      tile.setDim(this.mode === 'buy' && entry.price > state.coins);
      tile.setSelected(entry.item === this.picked);
      this.grid.add(tile);
      return tile;
    });

    this.showPicked(all);
    if (!all.length && !this.message.text) this.message.setText(words(ui, this.mode === 'buy' ? 'shop.empty' : 'shop.nothing'));
    this.setRows(pages > 1);
  }

  /** A square was pressed: pick it (the list itself stays as it is). */
  pick(item) {
    this.picked = item;
    this.message.setText('');
    this.tiles.forEach((t) => t.setSelected(t.item === item));
    this.showPicked(this.entries());
    this.setRows(this.more.visible);
  }

  /** The big picture, name, price and the Buy/Sell button for the picked item. */
  showPicked(all) {
    const ui = this.ui;
    const state = ui.session.state;
    const entry = all.find((e) => e.item === this.picked);
    this.entry = entry;
    const icon = entry && iconFor(ui, entry.item);
    this.big.setVisible(Boolean(icon));
    if (icon) this.big.setTexture(icon.tex, icon.frame);
    this.name.setText(entry ? itemName(ui, entry.item) : '');
    this.have.setText(entry ? words(ui, 'shop.have', { n: state.bag[entry.item] || 0 }) : '');
    this.priceCoin.setVisible(Boolean(entry));
    this.price.setText(entry ? String(entry.price) : '');
    this.action.setVisible(Boolean(entry));
    this.action.label.setText(words(ui, this.mode === 'buy' ? 'shop.buy' : 'shop.sell'));
    this.action.draw();
    this.action.setAlpha(entry && this.mode === 'buy' && entry.price > state.coins ? 0.6 : 1);
  }

  /** Keyboard rows: the tabs, the squares, the Buy/Sell button, OK. */
  setRows(paged) {
    const rows = [[this.buyTab, this.sellTab]];
    for (let i = 0; i < this.tiles.length; i += COLUMNS) rows.push(this.tiles.slice(i, i + COLUMNS));
    if (paged) rows[rows.length - 1].push(this.more);
    if (this.entry) rows.push([this.action]);
    rows.push([this.ok]);
    const wasVisible = this.focus.visible;
    const at = this.focus.current();
    this.setFocusRows(rows);
    // Keep the keyboard on the same kind of widget after a rebuild (Buy/Sell stays on Buy/Sell).
    rows.forEach((r) => r.forEach((w, ci) => {
      if (w === at) Object.assign(this.focus, { row: this.focus.rows.indexOf(r), col: ci });
    }));
    if (wasVisible) this.focus.show();
  }

  trade() {
    const ui = this.ui;
    if (!this.picked) return;
    const item = this.picked;
    const out = this.mode === 'buy' ? ui.session.rules.buy(this.shopId, item) : ui.session.rules.sell(this.shopId, item);
    applyOutcome(ui, out);
    const r = out.result;
    if (r.ok) {
      this.message.setText(this.mode === 'buy' ? words(ui, 'shop.bought', { item: itemName(ui, item) }) : words(ui, 'shop.sold', { price: r.price }));
      bounce(ui, this.big);
    } else {
      this.message.setText(words(ui, r.reason === 'coins' ? 'shop.noCoins' : 'shop.nothing'));
    }
    this.render();
  }
}
