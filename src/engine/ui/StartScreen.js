/**
 * The first screen: the player types their name and picks a friend to play as.
 * The name box is a real HTML text field, so phones and tablets show their own
 * keyboard; the wooden box behind it is drawn by the game.
 */

import Phaser from 'phaser';
import { Modal } from './Modal.js';
import { FocusCorners, UiButton, uiBox, uiText } from './widgets.js';
import { fontSafe, piece, words } from './theme.js';
import { makeAvatar } from '../state/PhotoStore.js';

const WIDTH = 290;
const CARD_W = 36;
const CARD_H = 40;
const CARD_GAP = 4;
const MAX_NAME = 16;
const FIELD_W = WIDTH - 28 - 32; // the name box leaves room on its right for the photo slot
const SLOT = 26;

// Animals sitting on the top edge of the panel, either side of the title plaque.
const MASCOTS = [
  { kind: 'hen', color: 0, x: 24, y: 3 },
  { kind: 'chick', color: 2, x: 42, y: 3, flip: true },
  { kind: 'cow', color: 1, anim: 'graze', x: 236, y: 4 },
  { kind: 'calf', color: 2, anim: 'graze', x: 266, y: 4 }
];

/** One choosable character: a small wooden card showing the character standing. */
class AvatarCard extends Phaser.GameObjects.Container {
  constructor(scene, x, y, character, selected, onSelect) {
    super(scene, x, y);
    this.character = character;
    this.onSelect = onSelect;
    this.bw = CARD_W;
    this.bh = CARD_H;
    this.selected = selected;
    this.draw();
    this.focusCorners = new FocusCorners(scene);
    this.add(this.focusCorners);
    this.hit = scene.add.zone(CARD_W / 2, CARD_H / 2, CARD_W, CARD_H).setInteractive({ useHandCursor: true });
    this.add(this.hit);
    this.hit.on('pointerup', () => this.activate());
    scene.add.existing(this);
  }

  draw() {
    this.face?.destroy();
    this.sprite?.destroy();
    this.badge?.destroy();
    const scene = this.scene;
    this.face = uiBox(scene, this.selected ? 'buttonOn' : 'button', 0, this.selected ? 2 : 0, CARD_W, CARD_H - (this.selected ? 2 : 0));
    this.addAt(this.face, 0);
    this.sprite = scene.add.sprite(2, this.selected ? 5 : 3, this.character.texture, 12).setOrigin(0, 0).setDisplaySize(32, 32);
    this.addAt(this.sprite, 1);
    // The chosen friend walks on the spot (everyone else just stands there).
    const walk = `${this.character.texture}-walk-down`;
    if (this.selected && !scene.session.settings.reducedMotion && scene.anims.exists(walk)) this.sprite.play(walk);
    if (this.selected) {
      // A tick badge, so the choice never depends on colour alone.
      const tick = piece(scene, 'tick');
      this.badge = scene.add.image(CARD_W - 12, -6, tick.tex, tick.frame).setOrigin(0, 0);
      this.add(this.badge);
    }
  }

  setSelected(selected) {
    if (this.selected === selected) return;
    this.selected = selected;
    this.draw();
    if (selected) this.hop();
  }

  /** A little jump when this friend is picked. */
  hop() {
    if (this.scene.session.settings.reducedMotion || !this.sprite) return;
    const y = this.sprite.y;
    this.scene.tweens.add({ targets: this.sprite, y: y - 6, duration: 120, yoyo: true, ease: 'Sine.easeOut' });
  }

  /** Keyboard focus on a card also chooses it. */
  setFocus(on) {
    if (on) {
      this.focusCorners.around(0, 0, CARD_W, CARD_H);
      this.onSelect(this);
    } else {
      this.focusCorners.setVisible(false);
    }
  }

  activate() {
    this.scene.registry.get('audio')?.play('select', { volume: 0.7, vary: 0.3 });
    this.onSelect(this);
  }
}


/** A small frame at the end of the name row. Tap it to add a photo (kept on this device); tap the x to remove it. */
class PhotoSlot extends Phaser.GameObjects.Container {
  constructor(scene, x, y, onPick, onRemove) {
    super(scene, x, y);
    this.bw = SLOT;
    this.bh = SLOT;
    this.onPick = onPick;
    this.onRemove = onRemove;
    this.frameBox = uiBox(scene, 'slotTan', 0, 0, SLOT, SLOT);
    this.add(this.frameBox);
    this.plus = uiText(scene, 0, 0, '+', { font: 'big', color: scene.content.art.ui.colors.inkSoft });
    this.plus.setPosition(Math.floor((SLOT - this.plus.width) / 2), 5);
    this.add(this.plus);
    this.label = uiText(scene, 0, SLOT + 1, words(scene, 'start.photo'), { color: scene.content.art.ui.colors.inkSoft });
    this.label.setX(Math.floor((SLOT - this.label.width) / 2));
    this.add(this.label);
    this.focusCorners = new FocusCorners(scene);
    this.add(this.focusCorners);
    this.hit = scene.add.zone(SLOT / 2, SLOT / 2, SLOT, SLOT).setInteractive({ useHandCursor: true });
    this.add(this.hit);
    this.hit.on('pointerup', () => this.activate());
    this.cross = uiText(scene, SLOT - 6, -6, 'x', { color: '#6b4b5b', stroke: '#f3f4e7' });
    this.crossHit = scene.add.zone(SLOT - 2, 2, 14, 14).setInteractive({ useHandCursor: true });
    this.crossHit.on('pointerup', () => this.onRemove());
    this.add([this.cross, this.crossHit]);
    scene.add.existing(this);
    this.showPhoto(scene.photoKey());
  }

  /** Show the given texture (or the plus sign when there is none). */
  showPhoto(key) {
    this.image?.destroy();
    this.image = null;
    if (key) {
      this.image = this.scene.add.image(SLOT / 2, SLOT / 2, key).setDisplaySize(SLOT - 4, SLOT - 4);
      this.addAt(this.image, 1);
    }
    this.plus.setVisible(!key);
    this.cross.setVisible(Boolean(key));
    this.crossHit.input.enabled = Boolean(key);
  }

  setFocus(on) {
    if (on) this.focusCorners.around(0, 0, SLOT, SLOT);
    else this.focusCorners.setVisible(false);
  }

  activate() {
    this.scene.registry.get('audio')?.play('tap', { volume: 0.7 });
    this.onPick();
  }
}

export class StartScreen extends Modal {
  constructor(ui, opts = {}) {
    const session = ui.session;
    const heroes = Object.values(ui.content.characters).filter((c) => c.player);
    super(ui, { width: WIDTH, height: 162, title: ui.content.config.shortTitle || ui.content.config.title, accent: 'pink', mascots: MASCOTS, ...opts });
    this.heroes = heroes;
    ui.registry.get('audio')?.music?.setMood('title');
    this.changing = session.state.profile.ready; // opened again from Settings: it can be cancelled
    const add = (o) => {
      this.root.add(o);
      return o;
    };
    const ink = ui.content.art.ui.colors.ink;

    // Name
    add(uiText(ui, 14, 27, words(ui, 'start.nameLabel')));
    add(uiBox(ui, 'buttonPressed', 14, 36, FIELD_W, 22));
    this.field = this.makeField(session);
    this.photoSlot = add(new PhotoSlot(ui, WIDTH - 14 - SLOT, 32, () => this.pickPhoto(), () => this.removePhoto()));
    this.photoInput = this.makePhotoInput();

    // Pick a friend
    add(uiText(ui, 14, 63, words(ui, 'start.pickLabel')));
    const chosenId = session.state.profile.avatarId;
    // Up to 6 friends fit in the row. With more, 5 show at a time and arrow buttons slide the row along
    // (the panel must stay short enough for a phone turned sideways, so there is no second row).
    this.shown = heroes.length <= 6 ? heroes.length : 5;
    this.first = 0;
    this.cards = heroes.map((hero) => add(new AvatarCard(ui, 0, 73, hero, hero.id === chosenId, (card) => this.choose(card))));
    if (heroes.length > this.shown) {
      this.prev = add(new UiButton(ui, 0, 81, { icon: 'left', onPress: () => this.slide(-this.shown) }));
      this.next = add(new UiButton(ui, 0, 81, { icon: 'right', onPress: () => this.slide(this.shown) }));
    }
    if (!this.cards.some((c) => c.selected)) this.cards[0].setSelected(true);
    this.showCard(this.cards.find((c) => c.selected));
    this.description = add(uiText(ui, 0, 117, '', { color: ink }));
    this.showDescription();

    // Go
    this.go = add(new UiButton(ui, 0, 130, { label: words(ui, 'start.go'), selectedMark: false, width: 110, height: 24, sound: 'tune', onPress: () => this.finish() }));
    this.go.setX(Math.floor((WIDTH - this.go.bw) / 2));

    this.setFocusRows([[this.photoSlot], this.cards, [this.go]]);
    this.layout();
    if (window.matchMedia?.('(pointer: fine)').matches) this.field.focus();
  }

  get chosen() {
    return this.cards.find((c) => c.selected)?.character || this.heroes[0];
  }

  choose(card) {
    this.cards.forEach((c) => c.setSelected(c === card));
    this.showCard(card);
    this.showDescription();
  }

  /** Slide the row of friends by `step` cards (the arrow buttons); at either end it wraps round. */
  slide(step) {
    const last = this.cards.length - this.shown;
    if (step > 0) this.first = this.first === last ? 0 : Math.min(last, this.first + step);
    else this.first = this.first === 0 ? last : Math.max(0, this.first + step);
    this.placeCards();
  }

  /** Make sure a card is in the visible part of the row (keyboard focus can move onto a hidden one). */
  showCard(card) {
    const i = this.cards.indexOf(card);
    if (i < this.first) this.first = i;
    else if (i >= this.first + this.shown) this.first = i - this.shown + 1;
    this.placeCards();
  }

  placeCards() {
    const arrows = this.prev ? 2 * (this.prev.bw + CARD_GAP) : 0;
    const x0 = Math.floor((WIDTH - (this.shown * CARD_W + (this.shown - 1) * CARD_GAP + arrows)) / 2);
    const cardsX = x0 + arrows / 2;
    this.cards.forEach((card, i) => {
      const on = i >= this.first && i < this.first + this.shown;
      card.setVisible(on);
      card.hit.input.enabled = on;
      if (on) card.setX(cardsX + (i - this.first) * (CARD_W + CARD_GAP));
    });
    if (this.prev) {
      this.prev.setX(x0);
      this.next.setX(cardsX + this.shown * (CARD_W + CARD_GAP));
    }
  }

  showDescription() {
    const hero = this.chosen;
    this.description.setText(fontSafe(`${hero.name}: ${hero.blurb || ''}`));
    this.description.setX(Math.floor((WIDTH - this.description.width) / 2));
  }

  /** A hidden file chooser. On a phone it offers the camera and the photo library. */
  makePhotoInput() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    input.className = 'photo-input';
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      input.value = '';
      if (!file) return;
      try {
        const blob = await makeAvatar(file);
        await this.ui.photos.save(blob);
        this.ui.session.change((s) => { s.profile.hasPhoto = true; });
        await this.ui.photos.loadTexture(this.ui);
        if (!this.closed) this.photoSlot.showPhoto(this.ui.photoKey());
      } catch (err) {
        console.warn('The photo could not be used:', err);
      }
    });
    document.body.appendChild(input);
    return input;
  }

  pickPhoto() {
    this.photoInput.click();
  }

  async removePhoto() {
    try {
      await this.ui.photos.clear();
    } catch (err) {
      console.warn('The photo could not be removed:', err);
    }
    this.ui.session.change((s) => { s.profile.hasPhoto = false; });
    this.ui.photos.removeTexture(this.ui);
    this.photoSlot.showPhoto(null);
  }

  /** The real text field, placed exactly over the wooden box. */
  makeField(session) {
    const input = document.createElement('input');
    input.className = 'name-input';
    input.type = 'text';
    input.maxLength = MAX_NAME;
    input.autocomplete = 'off';
    input.autocapitalize = 'words';
    input.spellcheck = false;
    input.setAttribute('aria-label', words(this.ui, 'start.nameLabel'));
    input.placeholder = words(this.ui, 'start.namePlaceholder');
    input.value = session.state.profile.ready ? session.state.profile.username : '';
    // The pixel font can only draw plain letters, so accents are simplified as they are typed.
    input.addEventListener('input', () => {
      const safe = fontSafe(input.value).replace(/[^\p{L}\p{N} '\-]/gu, '');
      if (safe !== input.value) {
        input.value = safe;
        input.setSelectionRange(safe.length, safe.length);
      }
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.finish();
      } else if (e.key === 'Escape') {
        input.blur();
      }
    });
    document.body.appendChild(input);
    return input;
  }

  layoutField() {
    const s = this.ui.scaleFactor;
    const box = { x: this.root.x + 14, y: this.root.y + 36, w: FIELD_W, h: 22 };
    const st = this.field.style;
    st.left = `${(box.x + 6) * s}px`;
    st.top = `${box.y * s}px`;
    st.width = `${(box.w - 12) * s}px`;
    st.height = `${box.h * s}px`;
    st.fontSize = `${18 * s}px`;
    st.lineHeight = `${box.h * s}px`;
    // The letters of the big pixel font sit high in their line; nudge them down to the middle.
    st.paddingTop = `${1 * s}px`;
    st.boxSizing = 'border-box';
  }

  layout() {
    super.layout();
    if (this.field) this.layoutField();
  }

  handleKey(key) {
    if (document.activeElement === this.field) return false; // typing: the field handles its own keys
    if (key === 'Escape' && !this.changing) return false; // the first-run screen cannot be skipped
    if (key === 'Escape') {
      this.close();
      return true;
    }
    return this.focus.handleKey(key);
  }

  finish() {
    const typed = this.field.value.replace(/[^\p{L}\p{N} '\-]/gu, '').trim().replace(/\s+/g, ' ');
    const name = typed || this.ui.content.config.recipient?.defaultName || 'Adventurer';
    const hero = this.chosen;
    this.ui.session.change((s) => {
      s.profile.username = name;
      s.profile.avatarId = hero.id;
      s.profile.ready = true;
    });
    this.close();
  }

  close() {
    this.ui?.registry.get('audio')?.music?.setMood(null);
    this.field?.remove();
    this.photoInput?.remove();
    super.close();
  }
}
