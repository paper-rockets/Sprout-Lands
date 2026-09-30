/**
 * A square button showing one item's picture, used by the cooking and shop screens.
 * It can be picked (a green tint, pressed in a little), greyed out (can't cook it / can't afford it),
 * and carry a small number in its corner (a price, or how many you have).
 * Works with the mouse, touch, and the keyboard (FocusGroup).
 */

import Phaser from 'phaser';
import { FocusCorners, uiBox, uiText } from './widgets.js';

export const TILE_SIZE = 26;

export class ItemTile extends Phaser.GameObjects.Container {
  constructor(scene, x, y, icon, onPress) {
    super(scene, x, y);
    this.baseY = y;
    this.bw = TILE_SIZE;
    this.bh = TILE_SIZE;
    this.onPress = onPress;
    this.box = uiBox(scene, 'slot', 0, 0, TILE_SIZE, TILE_SIZE);
    this.add(this.box);
    if (icon) {
      this.icon = scene.add.image(TILE_SIZE / 2, TILE_SIZE / 2 - 1, icon.tex, icon.frame);
      this.add(this.icon);
    }
    this.badge = uiText(scene, 0, 0, '', { color: '#ffffff', stroke: '#6b4b5b' });
    this.add(this.badge);
    this.focusCorners = new FocusCorners(scene);
    this.add(this.focusCorners);
    this.hit = scene.add.zone(TILE_SIZE / 2, TILE_SIZE / 2, TILE_SIZE, TILE_SIZE).setInteractive({ useHandCursor: true });
    this.add(this.hit);
    this.hit.on('pointerup', () => this.activate());
    scene.add.existing(this);
  }

  /** A small white number in the bottom-right corner (empty text hides it). */
  setBadge(text) {
    this.badge.setText(text === null || text === undefined ? '' : String(text));
    this.badge.setPosition(TILE_SIZE - 3 - Math.ceil(this.badge.width), TILE_SIZE - 13);
    return this;
  }

  setSelected(on) {
    this.box.setTint(on ? 0xcdeaa0 : 0xffffff);
    this.setY(on ? this.baseY + 1 : this.baseY);
    return this;
  }

  /** Greyed out: still pressable (so the screen can say what is missing), but clearly not ready. */
  setDim(on) {
    this.icon?.setAlpha(on ? 0.4 : 1);
    return this;
  }

  setFocus(on) {
    if (on) this.focusCorners.around(0, 0, TILE_SIZE, TILE_SIZE);
    else this.focusCorners.setVisible(false);
  }

  activate() {
    this.scene.registry.get('audio')?.play('tap', { volume: 0.7 });
    this.onPress?.(this);
  }
}
