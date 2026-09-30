/**
 * Building blocks for every menu: text, stretchable boxes, buttons, a slider,
 * an on/off tick box, and keyboard focus. Everything is drawn with the
 * Sprout Lands Premium UI art listed under "ui" in art.json.
 *
 * All sizes are "UI pixels" (one pixel of the UI art). The UI camera scales
 * them up by a whole number, so nothing is ever blurry.
 */

import Phaser from 'phaser';
import { fontSafe, piece, rectFrame, uiArt } from './theme.js';

const MIN_TOUCH = 22; // UI pixels; at the smallest UI scale (2) that is 44 screen pixels

/** Text in one of the two Sprout pixel fonts. `font` is 'small' (7 px capitals) or 'big' (14 px capitals). */
export function uiText(scene, x, y, value, { font = 'small', color, wrap, align = 'left', shadow, lineHeight, stroke } = {}) {
  const ui = uiArt(scene);
  const f = ui.fonts[font];
  const style = {
    fontFamily: f.family,
    fontSize: `${f.size}px`,
    color: color || ui.colors.ink,
    align,
    lineSpacing: (lineHeight ?? f.lineHeight) - (f.ascent + f.descent),
    padding: { left: 0, right: 1, top: 0, bottom: 2 },
    metrics: { ascent: f.ascent, descent: f.descent, fontSize: f.ascent + f.descent }
  };
  if (wrap) style.wordWrap = { width: wrap, useAdvancedWrap: true };
  if (shadow) style.shadow = { offsetX: 0, offsetY: 1, color: shadow, blur: 0, fill: true };
  if (stroke) {
    style.stroke = stroke;
    style.strokeThickness = 2;
  }
  const text = scene.add.text(Math.round(x), Math.round(y), fontSafe(value), style);
  text.capHeight = f.ascent;
  text.lineHeightPx = f.lineHeight;
  return text;
}

/** A title in the white-with-brown-shadow style of the pack's "SETTINGS" heading. */
export function uiTitle(scene, x, y, value) {
  const ui = uiArt(scene);
  return uiText(scene, x, y, value, { font: 'big', color: ui.colors.title, shadow: ui.colors.titleShadow });
}

/** A box from art.json ui.boxes, stretched to w x h without blurring its edges. */
export function uiBox(scene, name, x, y, w, h) {
  const def = uiArt(scene).boxes[name];
  if (!def) throw new Error(`art.json ui.boxes has no "${name}"`);
  const frame = rectFrame(scene, def.tex, def.rect);
  const [l, r, t, b] = def.slice;
  const box = scene.add.nineslice(Math.round(x), Math.round(y), def.tex, frame, Math.round(w), Math.round(h), l, r, t, b);
  return box.setOrigin(0, 0);
}

/** Four corner brackets drawn around the widget that has keyboard focus. */
export class FocusCorners extends Phaser.GameObjects.Container {
  constructor(scene) {
    super(scene, 0, 0);
    const sel = uiArt(scene).selector;
    this.corners = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'].map((k) => scene.add.image(0, 0, sel.tex, sel.corners[k]).setOrigin(0, 0));
    this.add(this.corners);
    this.setVisible(false);
    scene.add.existing(this);
  }

  /** Hug the rectangle (x0, y0) to (x1, y1), in the parent's coordinates. */
  around(x0, y0, x1, y1) {
    const [tl, tr, bl, br] = this.corners;
    // Each corner picture has its bracket in the cell's pixels 4-12.
    tl.setPosition(x0 - 4 - 1, y0 - 4 - 1);
    tr.setPosition(x1 - 12 + 1, y0 - 4 - 1);
    bl.setPosition(x0 - 4 - 1, y1 - 13 + 1);
    br.setPosition(x1 - 12 + 1, y1 - 13 + 1);
    this.setVisible(true);
  }
}

/**
 * A button. Either an icon button from the Icon Buttons sheet ({ icon: 'settings' })
 * or a stretchable text button ({ label: 'Slow' }, optionally { width: 50 }).
 * Pressing it (mouse, touch, or Enter/Space when focused) calls onPress.
 */
export class UiButton extends Phaser.GameObjects.Container {
  constructor(scene, x, y, opts) {
    super(scene, Math.round(x), Math.round(y));
    this.opts = opts;
    this.onPress = opts.onPress;
    this.selected = Boolean(opts.selected);
    this.isDown = false;
    const ui = uiArt(scene);

    if (opts.icon) {
      const ib = ui.iconButtons;
      this.iconFrame = ib.icons[opts.icon];
      if (this.iconFrame === undefined) throw new Error(`art.json has no icon button "${opts.icon}"`);
      // The button art sits at x 5-27, y 4-28 inside its 32 x 32 cell.
      this.face = scene.add.image(-5, -4, ib.tex, this.iconFrame).setOrigin(0, 0);
      this.add(this.face);
      this.bw = 22;
      this.bh = 24;
    } else {
      this.label = uiText(scene, 0, 0, opts.label, { font: opts.font || 'small' });
      this.add(this.label);
      this.markSize = opts.selectedMark === false ? 0 : 16;
      this.bw = Math.round(opts.width || this.label.width + 14 + this.markSize);
      this.bh = Math.round(opts.height || 22);
      this.draw();
    }

    this.focusCorners = new FocusCorners(scene);
    this.add(this.focusCorners);

    this.hit = scene.add.zone(this.bw / 2, this.bh / 2, Math.max(this.bw, MIN_TOUCH), Math.max(this.bh, MIN_TOUCH)).setInteractive({ useHandCursor: true });
    this.add(this.hit);
    this.hit.on('pointerdown', () => this.setDown(true));
    this.hit.on('pointerout', () => this.setDown(false));
    this.hit.on('pointerup', () => {
      const wasDown = this.isDown;
      this.setDown(false);
      if (wasDown) this.activate();
    });
    scene.add.existing(this);
  }

  /** (Re)draw a text button's face, label and tick mark for its current state. */
  draw() {
    this.face?.destroy();
    this.mark?.destroy();
    const name = (this.selected ? 'buttonOn' : 'button') + (this.isDown ? 'Pressed' : '');
    const shift = this.isDown ? 2 : 0;
    this.face = uiBox(this.scene, name, 0, shift, this.bw, this.bh - shift);
    this.addAt(this.face, 0);

    const markW = this.selected && this.markSize ? this.markSize : 0;
    const x = Math.floor((this.bw - this.label.width - markW) / 2) + markW;
    const y = 1 + Math.floor((this.bh - 5 - this.label.capHeight) / 2) + shift;
    this.label.setPosition(x, y);
    if (markW) {
      const tick = piece(this.scene, 'tick');
      this.mark = this.scene.add.image(x - markW, y - 2, tick.tex, tick.frame).setOrigin(0, 0);
      this.addAt(this.mark, 1);
    }
  }

  setDown(down) {
    if (this.isDown === down) return;
    this.isDown = down;
    if (this.opts.icon) this.face.setFrame(this.iconFrame + (down ? 1 : 0));
    else this.draw();
    this.onDownChanged?.(down);
  }

  /** Swap an icon button's picture (for example the talk button becomes a hand). */
  setIcon(name) {
    const frame = uiArt(this.scene).iconButtons.icons[name];
    if (frame === undefined || frame === this.iconFrame) return;
    this.iconFrame = frame;
    this.face.setFrame(frame + (this.isDown ? 1 : 0));
  }

  setSelected(selected) {
    if (this.selected === selected || this.opts.icon) return;
    this.selected = selected;
    this.draw();
  }

  setFocus(on) {
    if (on) this.focusCorners.around(0, 0, this.bw, this.bh);
    else this.focusCorners.setVisible(false);
  }

  activate() {
    this.scene.registry.get('audio')?.play(this.opts.sound || 'tap', { volume: 0.7 });
    this.onPress?.(this);
  }
}

/** A horizontal slider from 0 to 1 in steps of 0.1, using the pack's slider track and knob. */
export class UiSlider extends Phaser.GameObjects.Container {
  constructor(scene, x, y, width, value, onChange) {
    super(scene, Math.round(x), Math.round(y));
    this.bw = Math.round(width);
    this.bh = 12;
    this.value = Phaser.Math.Clamp(Math.round(value * 10) / 10, 0, 1);
    this.onChange = onChange;
    this.track = uiBox(scene, 'sliderTrack', 0, 3, this.bw, 7);
    this.add(this.track);
    const knob = piece(scene, 'sliderKnob');
    this.knob = scene.add.image(0, 0, knob.tex, knob.frame).setOrigin(0, 0);
    this.add(this.knob);
    this.focusCorners = new FocusCorners(scene);
    this.add(this.focusCorners);
    const margin = 4;
    this.hit = scene.add.zone(this.bw / 2, 6, this.bw + margin * 2, MIN_TOUCH).setInteractive({ useHandCursor: true });
    this.add(this.hit);
    // Dragging keeps working when the finger or mouse slides past the ends of the slider.
    const follow = (pointer) => {
      const point = scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const left = this.getWorldTransformMatrix().tx;
      this.setValue((point.x - left - 10) / (this.bw - 20), true);
    };
    const stop = () => {
      scene.input.off('pointermove', follow);
      scene.input.off('pointerup', stop);
    };
    this.hit.on('pointerdown', (pointer) => {
      follow(pointer);
      scene.input.on('pointermove', follow);
      scene.input.on('pointerup', stop);
    });
    this.once('destroy', stop);
    this.placeKnob();
    scene.add.existing(this);
  }

  placeKnob() {
    this.knob.setPosition(Math.round(this.value * (this.bw - 20)), 0);
  }

  setValue(v, fire = false) {
    const next = Math.round(Phaser.Math.Clamp(v, 0, 1) * 10) / 10;
    if (next === this.value) return;
    this.value = next;
    this.placeKnob();
    if (fire) this.onChange?.(this.value);
  }

  /** Left/Right on the keyboard nudge the slider. */
  adjust(direction) {
    this.setValue(this.value + direction * 0.1, true);
    return true;
  }

  setFocus(on) {
    if (on) this.focusCorners.around(-2, 0, this.bw + 2, this.bh);
    else this.focusCorners.setVisible(false);
  }

  activate() {}
}

/** An on/off box: a tick when on, a cross when off (so it never relies on colour alone). */
export class UiToggle extends UiButton {
  constructor(scene, x, y, on, onChange) {
    super(scene, x, y, { icon: 'blank', onPress: () => this.toggle() });
    this.on = Boolean(on);
    this.onChange = onChange;
    this.markImage = scene.add.image(11, 10, 'ui-checks', 0);
    this.addAt(this.markImage, 1);
    this.showMark();
  }

  showMark() {
    const p = piece(this.scene, this.on ? 'check' : 'cross');
    this.markImage.setTexture(p.tex, p.frame).setY(this.isDown ? 12 : 10);
  }

  onDownChanged() {
    this.showMark();
  }

  toggle() {
    this.on = !this.on;
    this.showMark();
    this.onChange?.(this.on);
  }
}

/**
 * Keyboard focus for a menu, arranged in rows of widgets.
 * Up/Down moves between rows, Left/Right moves inside a row (or nudges a slider),
 * Enter/Space presses. Corner brackets only show once the keyboard has been used.
 */
export class FocusGroup {
  constructor(rows) {
    this.rows = rows.filter((r) => r.length);
    this.row = 0;
    this.col = 0;
    this.visible = false;
  }

  current() {
    return this.rows[this.row]?.[this.col];
  }

  show() {
    this.visible = true;
    this.refresh();
  }

  refresh() {
    this.rows.forEach((r, ri) => r.forEach((w, ci) => w.setFocus(this.visible && ri === this.row && ci === this.col)));
  }

  /** Returns true when the key was used. */
  handleKey(key) {
    if (!this.rows.length) return false;
    if (!this.visible) {
      // The first key press only shows where the focus is.
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(key)) return false;
      this.show();
      return true;
    }
    const w = this.current();
    switch (key) {
      case 'ArrowUp':
        this.row = (this.row - 1 + this.rows.length) % this.rows.length;
        this.col = Math.min(this.col, this.rows[this.row].length - 1);
        break;
      case 'ArrowDown':
        this.row = (this.row + 1) % this.rows.length;
        this.col = Math.min(this.col, this.rows[this.row].length - 1);
        break;
      case 'ArrowLeft':
        if (!(w?.adjust && w.adjust(-1))) this.col = Math.max(0, this.col - 1);
        break;
      case 'ArrowRight':
        if (!(w?.adjust && w.adjust(1))) this.col = Math.min(this.rows[this.row].length - 1, this.col + 1);
        break;
      case 'Enter':
      case ' ':
        w?.activate();
        break;
      default:
        return false;
    }
    this.refresh();
    return true;
  }
}
