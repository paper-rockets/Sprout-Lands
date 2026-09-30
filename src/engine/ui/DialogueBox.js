/**
 * The speech box: the speaker's face in the wooden window, their name on a
 * small plate, and the words typed out a few letters at a time. Tap, Enter,
 * Space or E finishes the line, then moves on. A bouncing arrow means "more".
 */

import Phaser from 'phaser';
import { fontSafe, portraitFor } from './theme.js';
import { uiBox, uiText } from './widgets.js';

const CHARS_PER_SECOND = { slow: 18, normal: 36, fast: 80 };
// Measured on the box art: its plain text area is x 65-289, y 22-48 (a 304-wide box).
const LINES_PER_PAGE = 2;
const LINE_PITCH = 12;
const TEXT_X = 69;
const TEXT_Y = 26;
const TEXT_MARGIN_RIGHT = 19; // from the box's right edge

/** Each speaker's blips have their own pitch (the same every time), so friends sound different. */
function voiceOf(speaker) {
  if (!speaker) return 1;
  let h = 0;
  for (const ch of String(speaker)) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return 0.8 + (h % 9) * 0.07; // 0.8 to 1.36
}

export class DialogueBox {
  constructor(ui) {
    this.ui = ui;
    this.active = false;
  }

  /** `lines` is a list of { speaker, portrait, text }. `onDone` runs after the last one. */
  show(lines, onDone) {
    if (this.active) this.destroyParts();
    this.pages = [];
    for (const line of lines) {
      for (const page of this.paginate(fontSafe(line.text))) this.pages.push({ speaker: line.speaker, portrait: line.portrait, text: page });
    }
    if (!this.pages.length) {
      onDone?.();
      return;
    }
    this.onDone = onDone;
    this.active = true;
    this.index = 0;
    this.build();
    this.showPage();
    this.ui.setBusy();
  }

  get boxWidth() {
    return Phaser.Math.Clamp(this.ui.uiW - 24, 304, 400);
  }

  get textWidth() {
    return this.boxWidth - TEXT_X - TEXT_MARGIN_RIGHT;
  }

  /** Split text into pages of at most three lines, the way the box will wrap it. */
  paginate(text) {
    const probe = uiText(this.ui, 0, 0, '', { wrap: this.textWidth });
    const lines = probe.getWrappedText(text);
    probe.destroy();
    const pages = [];
    for (let i = 0; i < lines.length; i += LINES_PER_PAGE) pages.push(lines.slice(i, i + LINES_PER_PAGE).join('\n'));
    return pages;
  }

  build() {
    const ui = this.ui;
    this.catcher = ui.add.zone(0, 0, ui.uiW, ui.uiH).setOrigin(0, 0).setDepth(90).setInteractive();
    this.catcher.on('pointerdown', () => this.advance());
    this.root = ui.add.container(0, 0).setDepth(91);
    this.root.add(uiBox(ui, 'dialog', 0, 0, this.boxWidth, 64));
    this.portrait = ui.add.image(32, 31, 'ui-dialog').setVisible(false);
    this.text = uiText(ui, TEXT_X, TEXT_Y, '', { lineHeight: LINE_PITCH });
    const arrow = ui.add.sprite(0, 0, 'ui-continue', 0).setOrigin(0, 0);
    if (ui.anims.exists('continue-bob') && !ui.session.settings.reducedMotion) arrow.play('continue-bob');
    this.arrow = arrow.setVisible(false);
    this.plate = null;
    this.root.add([this.portrait, this.text, this.arrow]);
    this.layout();
  }

  layout() {
    if (!this.active) return;
    const { uiW, uiH } = this.ui;
    this.catcher.setSize(uiW, uiH, true);
    this.root.setPosition(Math.floor((uiW - this.boxWidth) / 2), uiH - 64 - 6);
    this.arrow.setPosition(this.boxWidth - 30, 34);
  }

  showPage() {
    const page = this.pages[this.index];
    const ui = this.ui;
    // The speaker's face.
    const face = portraitFor(ui, page.portrait);
    if (face) {
      this.portrait.setTexture(face.tex, face.frame).setDisplaySize(32, 32).setVisible(true);
    } else {
      this.portrait.setVisible(false);
    }
    // The name plate above the box.
    this.plate?.destroy();
    this.plate = null;
    if (page.speaker) {
      const name = uiText(ui, 0, 0, page.speaker);
      const w = name.width + 14;
      const plate = ui.add.container(14, -12);
      plate.add([uiBox(ui, 'button', 0, 0, w, 16), name]);
      name.setPosition(7, 3);
      this.plate = plate;
      this.root.add(plate);
    }
    this.full = page.text;
    this.voice = voiceOf(page.speaker);
    this.shown = 0;
    this.elapsed = 0;
    this.text.setText('');
    this.arrow.setVisible(false);
  }

  get typing() {
    return this.shown < this.full.length;
  }

  update(time, delta) {
    if (!this.active || !this.typing) return;
    this.elapsed += delta / 1000;
    const speed = CHARS_PER_SECOND[this.ui.session.settings.textSpeed] || CHARS_PER_SECOND.normal;
    const target = Math.min(this.full.length, Math.floor(this.elapsed * speed));
    if (target === this.shown) return;
    const before = this.shown;
    this.shown = target;
    this.text.setText(this.full.slice(0, this.shown));
    // A soft blip every few letters.
    const fresh = this.full.slice(before, this.shown);
    if (/\S/.test(fresh) && Math.floor(before / 3) !== Math.floor(this.shown / 3)) {
      this.ui.registry.get('audio')?.play('talk', { volume: 0.4, rate: this.voice, vary: 0.4 });
    }
    if (!this.typing) this.arrow.setVisible(true);
  }

  /** Finish the line being typed, or move to the next page, or close. */
  advance() {
    if (!this.active) return;
    if (this.typing) {
      this.shown = this.full.length;
      this.text.setText(this.full);
      this.arrow.setVisible(true);
      return;
    }
    if (this.index + 1 < this.pages.length) {
      this.index += 1;
      this.showPage();
      return;
    }
    this.close();
  }

  destroyParts() {
    this.plate = null;
    this.catcher?.destroy();
    this.root?.destroy();
  }

  close() {
    if (!this.active) return;
    this.active = false;
    this.destroyParts();
    const done = this.onDone;
    this.onDone = null;
    this.ui.setBusy();
    done?.();
  }
}
