import { Modal } from './Modal.js';
import { UiButton, uiText } from './widgets.js';
import { fontSafe, words } from './theme.js';

const WIDTH = 230;
const WRAP = 206;
const LINE = 10;
const GAP = 5;

/** Who made the art, fonts and sounds. The lines come from "credits" in game.config.json. */
export class CreditsPanel extends Modal {
  constructor(ui, opts = {}) {
    const lines = (ui.content.config.credits || []).map(fontSafe);
    // Long lines wrap, so measure them first to know how tall the panel must be.
    const probe = uiText(ui, 0, 0, '', { wrap: WRAP });
    const heights = lines.map((line) => probe.getWrappedText(line).length * LINE + GAP);
    probe.destroy();
    const height = Math.min(34 + heights.reduce((a, b) => a + b, 0) + 34, 172);
    super(ui, {
      width: WIDTH,
      height,
      title: words(ui, 'credits.title'),
      mascots: [{ kind: 'cow', color: 3, anim: 'graze', x: 190, y: 4 }, { kind: 'calf', color: 3, anim: 'graze', x: 34, y: 4, flip: true }],
      ...opts
    });
    const ink = ui.content.art.ui.colors.ink;
    let y = 34;
    lines.forEach((line, i) => {
      const t = uiText(ui, 0, y, line, { color: ink, wrap: WRAP, align: 'center' });
      t.setX(Math.floor((WIDTH - t.width) / 2));
      this.root.add(t);
      y += heights[i];
    });
    this.ok = new UiButton(ui, 0, height - 32, { label: words(ui, 'settings.close'), selectedMark: false, onPress: () => this.close() });
    this.ok.setX(Math.floor((WIDTH - this.ok.bw) / 2));
    this.root.add(this.ok);
    this.setFocusRows([[this.ok]]);
  }
}
