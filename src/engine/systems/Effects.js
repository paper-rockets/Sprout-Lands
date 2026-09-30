/**
 * Small bits of feedback that make picking things up feel good: a burst of
 * stars, a "+1" with the item's picture floating up, a wiggle when a tree is
 * shaken. With "Less motion" on, things fade in place instead of flying about.
 */

import { itemPicture, rectFrame } from '../ui/theme.js';
import { uiText } from '../ui/widgets.js';

const TOP = 100000; // above everything in the world

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.art = scene.content.art;
    this.attached = []; // emotes that stay over somebody's head: { bubble, target }
  }

  get reduced() {
    return this.scene.session.settings.reducedMotion;
  }

  /** A little burst of stars at a world position. */
  sparkle(x, y, count = 6) {
    const scene = this.scene;
    const frame = rectFrame(scene, 'ui-stars', [0, 16, 16, 16]);
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.6;
      const star = scene.add.image(x, y, 'ui-stars', frame).setDepth(TOP);
      const reach = 14 + Math.random() * 8;
      scene.tweens.add({
        targets: star,
        x: this.reduced ? x : x + Math.cos(angle) * reach,
        y: this.reduced ? y - 6 : y + Math.sin(angle) * reach * 0.7 - 4,
        alpha: 0,
        duration: this.reduced ? 500 : 560,
        ease: 'Cubic.easeOut',
        onComplete: () => star.destroy()
      });
    }
  }

  /** "+2" (or "-1" for something given away) with a picture, floating up from a world position. `icon` is { tex, frame }. */
  floater(x, y, icon, count) {
    const scene = this.scene;
    const box = scene.add.container(Math.round(x), Math.round(y - 12)).setDepth(TOP);
    const image = scene.add.image(0, 0, icon.tex, icon.frame);
    const label = uiText(scene, 0, -4, count < 0 ? `${count}` : `+${count}`,{ color: '#ffffff', stroke: '#6b4b5b' });
    const width = image.width + 2 + label.width;
    image.setX(-width / 2 + image.width / 2);
    label.setX(Math.round(-width / 2 + image.width + 2));
    box.add([image, label]);
    scene.tweens.add({
      targets: box,
      y: box.y - (this.reduced ? 0 : 16),
      alpha: { from: 1, to: 0 },
      delay: 350,
      duration: 700,
      ease: 'Sine.easeIn',
      onComplete: () => box.destroy()
    });
  }

  /** Coins and hearts bring their own sound, a moment after whatever sound made them. */
  sound(id, delay = 0) {
    this.scene.registry.get('audio')?.play(id, { volume: 0.8, delay });
  }

  /** Floater for a collectible item, by its id in art.json items. */
  itemFloater(x, y, itemId, count = 1) {
    const item = this.art.items[itemId];
    if (item) this.floater(x, y, itemPicture(this.scene, item), count);
  }

  coinFloater(x, y, count) {
    this.sound('coin', 0.12);
    this.floater(x, y, { tex: 'ui-coins', frame: rectFrame(this.scene, 'ui-coins', [32, 0, 16, 16]) }, count);
  }

  /** Wiggle a sprite from side to side (a shaken tree). */
  shake(sprite, amount = 1) {
    if (this.reduced) return;
    const x0 = sprite.x;
    this.scene.tweens.add({
      targets: sprite,
      x: { from: x0 - amount, to: x0 + amount },
      duration: 55,
      yoyo: true,
      repeat: 5,
      onComplete: () => sprite.setX(x0)
    });
  }

  /** A heart floating up, for petting an animal. */
  heartFloater(x, y, count = 1) {
    this.sound('heart', 0.1);
    this.floater(x, y, { tex: 'ui-hearts', frame: rectFrame(this.scene, 'ui-hearts', [0, 16, 16, 16]) }, count);
  }

  /** A big ring of hearts bursting out and drifting up, for a friend given their favourite treat. */
  heartBurst(x, y, count = 8) {
    this.sound('heart');
    const scene = this.scene;
    const frame = rectFrame(scene, 'ui-hearts', [48, 64, 32, 32]); // the big pink heart with a white edge
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2;
      const heart = scene.add.image(x, y, 'ui-hearts', frame).setDepth(TOP).setScale(this.reduced ? 0.5 : 0.2);
      const reach = 26 + (i % 2) * 8;
      scene.tweens.add({
        targets: heart,
        x: this.reduced ? x + Math.cos(angle) * 12 : x + Math.cos(angle) * reach,
        y: this.reduced ? y + Math.sin(angle) * 8 : y + Math.sin(angle) * reach * 0.7 - 12,
        scale: 0.5,
        duration: this.reduced ? 300 : 520,
        ease: 'Back.easeOut',
        onComplete: () => scene.tweens.add({ targets: heart, alpha: 0, y: heart.y - (this.reduced ? 0 : 12), delay: 1100, duration: 600, onComplete: () => heart.destroy() })
      });
    }
  }

  /** A round little bubble with an icon (a name from art.json ui.mapIcons) in it. Returns the container. */
  bubble(icon) {
    const scene = this.scene;
    const frame = this.art.ui.mapIcons?.[icon];
    if (frame === undefined) return null;
    const box = scene.add.container(0, 0).setDepth(TOP - 1);
    box.add(scene.add.circle(0, 0, 7, 0xe8cfa6).setStrokeStyle(1, 0x90625d));
    box.add(scene.add.image(0, 0, 'ui-icons', frame).setDisplaySize(12, 12));
    return box;
  }

  /** The bubble pops up over `target` (a sprite) for a moment, then floats away. */
  emote(target, icon, ms = 1300) {
    const box = this.bubble(icon);
    if (!box) return;
    const top = () => target.y - target.displayHeight * 0.75 - 4;
    box.setPosition(Math.round(target.x), Math.round(top()));
    box.setScale(this.reduced ? 1 : 0);
    const follow = { target, box, top, until: this.scene.time.now + ms };
    this.attached.push({ ...follow, bob: false, temporary: true });
    if (!this.reduced) this.scene.tweens.add({ targets: box, scale: 1, duration: 200, ease: 'Back.easeOut' });
    this.scene.time.delayedCall(ms, () => {
      const entry = this.attached.find((e) => e.box === box);
      if (entry) this.attached.splice(this.attached.indexOf(entry), 1);
      this.scene.tweens.add({ targets: box, alpha: 0, y: box.y - (this.reduced ? 0 : 8), duration: 300, onComplete: () => box.destroy() });
    });
  }

  /** A bubble that stays over somebody's head and bobs (a "!" over someone with a quest). Returns a function that removes it. */
  attachEmote(target, icon) {
    const box = this.bubble(icon);
    if (!box) return () => {};
    const entry = { target, box, top: () => target.y - target.displayHeight * 0.75 - 4, bob: !this.reduced, temporary: false };
    this.attached.push(entry);
    return () => {
      this.attached.splice(this.attached.indexOf(entry), 1);
      box.destroy();
    };
  }

  update(time) {
    for (const e of this.attached) {
      const bob = e.bob ? Math.sin(time / 260) * 1.5 : 0;
      e.box.setPosition(Math.round(e.target.x), Math.round(e.top() + bob));
    }
  }

  /**
   * A burst of confetti at a world position, for a finished quest. Little squares in the
   * game's soft colours shoot up and flutter down. With "Less motion" on, a star burst instead.
   */
  confetti(x, y, count = 48) {
    if (this.reduced) {
      this.sparkle(x, y, 10);
      return;
    }
    const scene = this.scene;
    const colours = [0xf6a5c0, 0xffe07a, 0x9fd8f5, 0xb5e38b, 0xd3b5f0, 0xffb38a, 0xffffff];
    for (let i = 0; i < count; i += 1) {
      const bit = scene.add.rectangle(x, y, 2 + (i % 2), 2 + ((i >> 1) % 2), colours[i % colours.length]).setDepth(TOP);
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      const speed = 40 + Math.random() * 50;
      const peakX = x + Math.cos(angle) * speed;
      const peakY = y + Math.sin(angle) * speed;
      const drift = (Math.random() - 0.5) * 30;
      scene.tweens.chain({
        targets: bit,
        tweens: [
          { x: peakX, y: peakY, angle: Math.random() * 360, duration: 380 + Math.random() * 160, ease: 'Cubic.easeOut' },
          { x: peakX + drift, y: peakY + 40 + Math.random() * 30, angle: '+=240', alpha: 0, duration: 900 + Math.random() * 500, ease: 'Sine.easeIn' }
        ],
        onComplete: () => bit.destroy()
      });
    }
  }

  /** A small hop (a happy animal, a found treasure). */
  hop(sprite, height = 4) {
    if (this.reduced) return;
    const y0 = sprite.y;
    this.scene.tweens.add({ targets: sprite, y: y0 - height, duration: 110, yoyo: true, onComplete: () => sprite.setY(y0) });
  }
}
