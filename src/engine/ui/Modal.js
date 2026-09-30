/**
 * The base of every full menu screen (settings, quests, map, credits, ...):
 * a dimmed backdrop that swallows taps, and a centred wooden panel.
 * Screens add their own widgets to `this.root` using panel coordinates
 * (0, 0 is the panel's top-left corner).
 */

import { addGarden, addMascot, addPlaque } from './Decor.js';
import { FocusGroup, uiBox } from './widgets.js';

export class Modal {
  constructor(ui, { width, height, title, box = 'panel', onClose, accent = 'brown', garden = true, mascots = [] }) {
    this.ui = ui;
    this.width = width;
    this.height = height;
    this.onClose = onClose;
    this.focus = new FocusGroup([]);

    this.dim = ui.add.rectangle(0, 0, 10, 10, 0x1d1a24, 0.6).setOrigin(0, 0).setDepth(100);
    this.blocker = ui.add.zone(0, 0, 10, 10).setOrigin(0, 0).setDepth(100).setInteractive();
    this.root = ui.add.container(0, 0).setDepth(101);
    this.root.add(uiBox(ui, box, 0, 0, width, height));
    if (garden) addGarden(ui, this.root, width, height);
    if (title) this.plaque = addPlaque(ui, this.root, width, title, accent);
    for (const spec of mascots) addMascot(ui, this.root, spec);
    this.layout();
  }

  /** Centre the panel on the screen; called again whenever the window size changes. */
  layout() {
    const { uiW, uiH } = this.ui;
    this.dim.setSize(uiW, uiH);
    this.blocker.setSize(uiW, uiH, true);
    this.root.setPosition(Math.floor((uiW - this.width) / 2), Math.floor((uiH - this.height) / 2));
  }

  /** Set up keyboard focus. `rows` is a list of rows of widgets. */
  setFocusRows(rows) {
    this.focus = new FocusGroup(rows);
  }

  /** Called by the UI scene for key presses while this screen is open. Returns true if used. */
  handleKey(key) {
    if (key === 'Escape') {
      this.close();
      return true;
    }
    return this.focus.handleKey(key);
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.dim.destroy();
    this.blocker.destroy();
    this.root.destroy();
    this.onClose?.();
  }
}
