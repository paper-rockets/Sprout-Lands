import { Modal } from './Modal.js';
import { addHero, addMascot } from './Decor.js';
import { UiButton, uiText } from './widgets.js';
import { fillBlanks, fontSafe, piece, words } from './theme.js';

const WIDTH = 300;
const HEIGHT = 152;
const CONFETTI = 46;
const CONFETTI_PIECES = ['starSmall', 'heart', 'coin', 'starSmall', 'heart'];
const CONFETTI_TINTS = [0xffffff, 0xffffff, 0xffe89a, 0xf6bccf, 0xb4dcf5, 0xcdeaa0];
const STAR_GAP = 380; // milliseconds between one star popping in and the next
const DEFAULT_CAST = [{ hero: true }, { character: 'gardener' }, { kind: 'hen', color: 0 }, { kind: 'chick', color: 1 }, { kind: 'calf', color: 0 }];

/**
 * Shown when every quest is finished: confetti falls, three gold stars pop in one at a time,
 * the player's name is written big, and the cast (the hero and friends from `config.ending.cast`)
 * hops along the bottom. "Less motion" keeps the stars, the name and the cast, but everything stands still.
 */
export class EndingPanel extends Modal {
  constructor(ui, opts = {}) {
    super(ui, { width: WIDTH, height: HEIGHT, title: words(ui, 'ending.title'), accent: 'gold', ...opts });
    this.still = Boolean(ui.session.settings.reducedMotion);
    this.motion = [];
    this.confetti = [];
    this.colors = ui.content.art.ui.colors;
    const audio = ui.registry.get('audio');

    this.addStars(ui, audio);
    this.addWords(ui);

    this.ok = new UiButton(ui, 0, 92, { label: words(ui, 'ending.again'), selectedMark: false, sound: 'tune', onPress: () => this.close() });
    this.ok.setX(Math.floor((WIDTH - this.ok.bw) / 2));
    this.root.add(this.ok);
    this.setFocusRows([[this.ok]]);

    this.addCast(ui);
    if (!this.still) this.addConfetti(ui);
    audio?.play('ending');
  }

  /** Three stars that pop in one by one, each with a little sound. */
  addStars(ui, audio) {
    const star = piece(ui, 'starFull');
    for (let i = 0; i < 3; i += 1) {
      const y = i === 1 ? 20 : 24; // the middle star sits a little higher
      const image = ui.add.image(Math.floor(WIDTH / 2) + (i - 1) * 26, y + 9, star.tex, star.frame).setOrigin(0.5, 0.5);
      this.root.add(image);
      if (this.still) continue;
      image.setScale(0);
      ui.time.delayedCall(250 + i * STAR_GAP, () => {
        if (this.closed) return;
        audio?.play('star', { volume: 0.8, rate: 1 + i * 0.12 });
        this.motion.push(ui.tweens.add({ targets: image, scale: 1, duration: 320, ease: 'Back.easeOut' }));
      });
    }
  }

  /** The player's name in big letters, and the thank-you line. */
  addWords(ui) {
    const name = fontSafe(ui.session.state.profile.username);
    const big = uiText(ui, 0, 46, name, { font: 'big', color: this.colors.title, shadow: this.colors.titleShadow, wrap: WIDTH - 30, align: 'center' });
    big.setX(Math.floor((WIDTH - big.width) / 2));
    this.root.add(big);
    const thanks = uiText(ui, 0, 68, fillBlanks(words(ui, 'ending.thanks'), { name }), { color: this.colors.ink, wrap: WIDTH - 40, align: 'center' });
    thanks.setX(Math.floor((WIDTH - thanks.width) / 2));
    this.root.add(thanks);
  }

  /** The cast lined up along the bottom, hopping one after another. */
  addCast(ui) {
    const list = ui.content.config.ending?.cast || DEFAULT_CAST;
    const gap = Math.min(52, (WIDTH - 40) / list.length);
    const x0 = WIDTH / 2 - (gap * (list.length - 1)) / 2;
    list.forEach((member, i) => {
      const x = x0 + i * gap;
      const y = HEIGHT - 8;
      let sprite = null;
      if (member.hero) sprite = addHero(ui, this.root, x, y);
      else if (member.character) sprite = this.addCharacter(ui, member.character, x, y);
      else if (member.kind) sprite = addMascot(ui, this.root, { anim: 'idle', ...member, x, y });
      if (!sprite) return;
            if (this.still) return;
      this.motion.push(
        ui.tweens.add({ targets: sprite, y: y - 8, duration: 260, yoyo: true, repeat: -1, repeatDelay: 380, delay: i * 140, ease: 'Sine.easeOut' })
      );
    });
  }

  addCharacter(ui, id, x, y) {
    const texture = ui.content.characters[id]?.texture;
    if (!texture) return null;
    const sprite = ui.add.sprite(Math.round(x), Math.round(y), texture, 12).setOrigin(0.5, 1);
    const key = `${texture}-walk-down`;
    if (ui.anims.exists(key) && !this.still) sprite.play(key);
    this.root.add(sprite);
    return sprite;
  }

  /** Stars, hearts and coins drifting down over the whole screen. */
  addConfetti(ui) {
    const random = () => Math.random();
    for (let i = 0; i < CONFETTI; i += 1) {
      const p = piece(ui, CONFETTI_PIECES[i % CONFETTI_PIECES.length]);
      const image = ui.add.image(0, 0, p.tex, p.frame).setDepth(102).setAlpha(0.95);
      const tint = CONFETTI_TINTS[Math.floor(random() * CONFETTI_TINTS.length)];
      if (tint !== 0xffffff) image.setTint(tint);
      this.confetti.push({
        image,
        x: random() * ui.uiW,
        y: random() * ui.uiH * 1.3 - ui.uiH,
        speed: 22 + random() * 26,
        sway: 4 + random() * 8,
        rate: 1 + random() * 1.5,
        phase: random() * 6.28
      });
    }
  }

  update(time, delta) {
    if (!this.confetti.length) return;
    const ui = this.ui;
    const dt = delta / 1000;
    const t = time / 1000;
    for (const c of this.confetti) {
      c.y += c.speed * dt;
      if (c.y > ui.uiH + 16) {
        c.y = -16;
        c.x = Math.random() * ui.uiW;
      }
      c.image.setPosition(Math.round(c.x + Math.sin(t * c.rate + c.phase) * c.sway), Math.round(c.y));
      // Turning edge-on as it sways, like paper.
      c.image.setScale(Math.abs(Math.cos(t * c.rate * 1.3 + c.phase)) * 0.6 + 0.4, 1);
    }
  }

  close() {
    for (const tween of this.motion) tween.stop();
    for (const c of this.confetti) c.image.destroy();
    this.confetti = [];
    super.close();
  }
}
