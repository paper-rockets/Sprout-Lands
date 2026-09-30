/**
 * A wooden sign that drops in at the top of the screen for a moment, one at a time:
 * "New quest!", "Quest done!", a new place found. The small heading comes from
 * text/strings.json ("notice.<kind>"), the big line is the quest or place name.
 * It waits while a full screen (start screen, settings...) is open.
 */

import { ACCENTS } from './Decor.js';
import { fontSafe, uiArt, words } from './theme.js';
import { uiBox, uiText } from './widgets.js';

// Which bubble picture (art.json ui.mapIcons) and plaque colour each kind of notice gets.
const LOOK = {
  quest: { icon: 'exclaim', accent: 'gold' },
  questDone: { icon: 'star', accent: 'green' },
  reward: { icon: 'star', accent: 'gold' },
  area: { icon: 'sprout', accent: 'blue' },
  unlock: { icon: 'home', accent: 'pink' }
};
const HOLD_MS = 2600;

export class NoticeBanner {
  constructor(ui) {
    this.ui = ui;
    this.queue = [];
    this.showing = null;
  }

  push(notice) {
    this.queue.push(notice);
    this.next();
  }

  next() {
    if (this.showing || !this.queue.length || this.ui.modal) return;
    const notice = this.queue.shift();
    const ui = this.ui;
    const look = LOOK[notice.kind] || LOOK.quest;
    const colors = uiArt(ui).colors;
    const heading = uiText(ui, 0, 5, words(ui, `notice.${notice.kind}`), { color: colors.inkSoft || colors.ink });
    const title = uiText(ui, 0, 15, fontSafe(String(notice.text || '').toUpperCase()), { font: 'big', color: colors.title, shadow: colors.titleShadow });
    const w = Math.max(90, Math.ceil(Math.max(heading.width, title.width)) + 44);
    const h = 36;
    const box = uiBox(ui, 'button', 0, 0, w, h).setTint(ACCENTS[look.accent] ?? ACCENTS.brown);
    heading.setX(Math.floor((w - heading.width) / 2) + 8);
    title.setX(Math.floor((w - title.width) / 2) + 8);
    const parts = [box, heading, title];
    const frame = ui.content.art.ui.mapIcons?.[look.icon];
    if (frame !== undefined) {
      parts.push(ui.add.circle(14, h / 2, 9, 0xe8cfa6).setStrokeStyle(1, 0x90625d));
      parts.push(ui.add.image(14, h / 2, 'ui-icons', frame).setDisplaySize(14, 14));
    }
    const x = Math.floor((ui.uiW - w) / 2);
    const top = this.topFor(x, w);
    const banner = ui.add.container(x, top, parts).setDepth(30);
    this.showing = banner;
    const reduced = ui.session.settings.reducedMotion;
    const done = () => {
      banner.destroy();
      this.showing = null;
      this.next();
    };
    if (reduced) {
      ui.time.delayedCall(HOLD_MS, done);
      return;
    }
    banner.y = -h - 4;
    ui.tweens.add({ targets: banner, y: top, duration: 320, ease: 'Back.easeOut' });
    ui.tweens.add({ targets: banner, y: -h - 4, delay: HOLD_MS, duration: 260, ease: 'Sine.easeIn', onComplete: done });
  }

  /**
   * The sign sits at the top between the goal note (top left) and the buttons (top right).
   * On a narrow screen where it would cover them, it drops in just below them instead.
   */
  topFor(x, w) {
    const hud = this.ui.hud;
    if (!hud || hud.hidden) return 4;
    let left = 0;
    let bottom = 0;
    if (hud.goalBox.visible) {
      left = hud.goalBox.x + hud.goalBox.width;
      bottom = hud.goalBox.y + hud.goalBox.height;
    }
    for (const c of hud.counters) {
      left = Math.max(left, c.x + c.bw);
      bottom = Math.max(bottom, c.y + c.bh);
    }
    let right = this.ui.uiW;
    for (const b of hud.buttons) {
      right = Math.min(right, b.x);
      bottom = Math.max(bottom, b.y + b.bh);
    }
    return x < left + 2 || x + w > right - 2 ? bottom + 3 : 4;
  }

  /** Called every frame, so a notice that waited for a screen to close shows up afterwards. */
  update() {
    if (!this.showing) this.next();
  }
}
