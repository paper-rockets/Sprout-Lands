/**
 * The buttons and notes shown on top of the game world:
 *   top left     the goal, and counters for hearts, coins and stars
 *   top right    Quests, Map, and the gear (settings)
 *   bottom left  the item bar: eggs, fruit, berries, honey and gems collected so far
 *   bottom right the use button (talk, shake a tree, open a chest), only when something is near
 */

import Phaser from 'phaser';
import { UiButton, uiBox, uiText } from './widgets.js';
import { itemPicture, piece, rectFrame, uiArt, words } from './theme.js';

const MARGIN = 4;

/** A small plate with a picture and a number: hearts, coins or stars. */
class Counter extends Phaser.GameObjects.Container {
  constructor(scene, icon, value) {
    super(scene, 0, 0);
    this.plate = uiBox(scene, 'panel', 0, 0, 40, 16);
    this.icon = scene.add.image(3, 0, icon.tex, icon.frame).setOrigin(0, 0);
    this.number = uiText(scene, 21, 4, '0');
    this.add([this.plate, this.icon, this.number]);
    this.bw = 40;
    this.bh = 16;
    this.value = null;
    this.set(value);
    scene.add.existing(this);
  }

  set(value) {
    if (value === this.value) return;
    this.value = value;
    this.number.setText(String(value));
    this.bw = Math.max(34, 21 + Math.ceil(this.number.width) + 6);
    this.plate.setSize(this.bw, 16);
  }

  /** A little jump of the picture when the number goes up. */
  pop() {
    if (this.scene.session.settings.reducedMotion) return;
    this.scene.tweens.add({ targets: this.icon, y: { from: -3, to: 0 }, duration: 260, ease: 'Bounce.easeOut' });
  }
}

/** One slot of the item bar. */
class Slot extends Phaser.GameObjects.Container {
  constructor(scene, group, item) {
    super(scene, 0, 0);
    this.group = group;
    this.bw = 28;
    this.bh = 30;
    this.box = uiBox(scene, 'slot', 0, 0, this.bw, this.bh);
    this.icon = scene.add.image(6, 6, item.tex, item.frame).setOrigin(0, 0).setAlpha(0.3);
    this.count = uiText(scene, 0, 0, '', { color: '#ffffff', stroke: '#6b4b5b' });
    this.add([this.box, this.icon, this.count]);
    scene.add.existing(this);
  }

  set(n) {
    this.icon.setAlpha(n > 0 ? 1 : 0.3);
    this.count.setText(n > 0 ? (n > 99 ? '99+' : String(n)) : '');
    this.count.setPosition(this.bw - 4 - Math.ceil(this.count.width), this.bh - 15);
  }

  pop() {
    if (this.scene.session.settings.reducedMotion) return;
    this.scene.tweens.add({ targets: this.icon, y: { from: 2, to: 6 }, duration: 300, ease: 'Bounce.easeOut' });
  }

  /** Something left the bag (a treat given to a friend): its picture lifts out of the slot with "-1" and fades. */
  give(picture) {
    const scene = this.scene;
    const still = scene.session.settings.reducedMotion;
    const image = scene.add.image(6, 6, picture.tex, picture.frame).setOrigin(0, 0);
    const label = uiText(scene, 16, 0, '-1', { color: '#ffffff', stroke: '#6b4b5b' });
    this.add([image, label]);
    scene.tweens.add({
      targets: [image, label],
      y: still ? '+=0' : '-=22',
      alpha: { from: 1, to: 0 },
      delay: 250,
      duration: still ? 700 : 900,
      ease: 'Sine.easeIn',
      onComplete: () => {
        image.destroy();
        label.destroy();
      }
    });
  }
}

export class Hud {
  constructor(ui) {
    this.ui = ui;
    const session = ui.session;
    this.goalBox = uiBox(ui, 'panel', MARGIN, MARGIN, 100, 20).setDepth(10);
    this.goalText = uiText(ui, MARGIN + 7, MARGIN + 6, '').setDepth(10);

    // Hearts, coins and stars.
    const art = uiArt(ui);
    const heart = piece(ui, 'heart');
    const star = piece(ui, 'starSmall');
    this.coinFrames = art.coinSpin.map((c) => ({ tex: c.tex, frame: rectFrame(ui, c.tex, c.rect) }));
    this.hearts = new Counter(ui, heart, session.state.hearts);
    this.coins = new Counter(ui, this.coinFrames[2], session.state.coins);
    this.stars = new Counter(ui, star, session.state.stars);
    this.counters = [this.hearts, this.coins, this.stars];
    this.counters.forEach((c) => c.setDepth(10));
    if (!session.settings.reducedMotion) {
      let frame = 0;
      this.coinTimer = ui.time.addEvent({
        delay: 160,
        loop: true,
        callback: () => {
          frame = (frame + 1) % this.coinFrames.length;
          this.coins.icon.setTexture(this.coinFrames[frame].tex, this.coinFrames[frame].frame);
        }
      });
    }

    // The item bar.
    const items = ui.content.art.items;
    this.slots = (ui.content.art.itemBar || []).map((entry) => new Slot(ui, entry.group, items[entry.icon]));
    this.slots.forEach((s) => s.setDepth(10));

    this.buttons = [];
    if (ui.hasScreen('journal')) this.buttons.push(new UiButton(ui, 0, 0, { label: words(ui, 'hud.quests'), selectedMark: false, onPress: () => ui.open('journal') }));
    if (ui.hasScreen('map')) this.buttons.push(new UiButton(ui, 0, 0, { label: words(ui, 'hud.map'), selectedMark: false, onPress: () => ui.open('map') }));
    this.buttons.push(new UiButton(ui, 0, 0, { icon: 'settings', onPress: () => ui.open('settings') }));
    this.talk = new UiButton(ui, 0, 0, { icon: 'talk', onPress: () => ui.game.events.emit('ui-interact') });
    this.talk.setVisible(false);
    [...this.buttons, this.talk].forEach((b) => b.setDepth(10));
    this.refresh();
    this.layout();
  }

  /** Update the counters and the item bar from the saved state. */
  refresh() {
    const s = this.ui.session;
    this.hearts.set(s.state.hearts);
    this.coins.set(s.state.coins);
    this.stars.set(s.state.stars);
    this.slots.forEach((slot) => slot.set(s.groupCount(slot.group)));
    this.layoutCounters();
  }

  /** Something was gained: make the matching counter or slot jump. */
  pop(gain) {
    if (gain.hearts) this.hearts.pop();
    if (gain.coins) this.coins.pop();
    if (gain.stars) this.stars.pop();
    if (gain.item) {
      const item = this.ui.content.art.items[gain.item];
      const slot = this.slots.find((s) => s.group === item?.group);
      if (gain.count < 0) slot?.give(itemPicture(this.ui, item));
      else slot?.pop();
    }
  }

  setGoal(text) {
    this.goalText.setText(text ? text.toUpperCase() : '');
    this.layout();
  }

  /** Show the use button with the right picture, or hide it (info is null). */
  setNear(info) {
    this.wantTalk = Boolean(info);
    if (info) this.talk.setIcon(info.icon || 'talk');
    this.talk.setVisible(this.wantTalk && !this.hidden);
  }

  /** Hide everything while a full screen or the speech box is showing. */
  setHidden(hidden) {
    this.hidden = hidden;
    this.goalBox.setVisible(!hidden && Boolean(this.goalText.text));
    this.goalText.setVisible(!hidden);
    this.buttons.forEach((b) => b.setVisible(!hidden));
    this.counters.forEach((c) => c.setVisible(!hidden));
    this.slots.forEach((s) => s.setVisible(!hidden));
    this.talk.setVisible(!hidden && Boolean(this.wantTalk));
  }

  layoutCounters() {
    const top = MARGIN + (this.goalBox.height || 20) + 3;
    let x = MARGIN;
    for (const c of this.counters) {
      c.setPosition(x, top);
      x += c.bw + 3;
    }
  }

  layout() {
    const { uiW, uiH } = this.ui;
    // Buttons run along the top right edge.
    let x = uiW - MARGIN;
    for (let i = this.buttons.length - 1; i >= 0; i -= 1) {
      const b = this.buttons[i];
      // A round icon button's picture is a little wider than the button: keep it off the edge.
      x -= b.bw + (b.opts.icon ? 2 : 0);
      b.setPosition(x, MARGIN + (b.opts.icon ? 1 : 0));
      x -= 4;
    }
    const room = x - MARGIN - 4;
    this.goalText.setWordWrapWidth(Math.min(190, room) - 14, true);
    const lines = Math.max(1, this.goalText.getWrappedText(this.goalText.text || ' ').length);
    // The note is only as wide as its words need.
    this.goalBox.setSize(Math.max(40, Math.ceil(this.goalText.width) + 14), 12 + lines * 10);
    this.goalBox.setVisible(!this.hidden && Boolean(this.goalText.text));
    this.layoutCounters();
    this.talk.setPosition(uiW - MARGIN - this.talk.bw, uiH - MARGIN - this.talk.bh - 2);
    // The item bar sits along the bottom left.
    let sx = MARGIN;
    for (const slot of this.slots) {
      slot.setPosition(sx, uiH - MARGIN - slot.bh);
      sx += slot.bw + 2;
    }
  }
}
