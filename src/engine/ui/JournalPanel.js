import Phaser from 'phaser';
import { Modal } from './Modal.js';
import { addHero, addPlaque } from './Decor.js';
import { FocusCorners, UiButton, uiBox, uiText } from './widgets.js';
import { iconFor, piece, portraitFor, words } from './theme.js';

const WIDTH = 320;
const HEIGHT = 160;
const TAB_Y = 17;
const TAB = 22;
const TOP = 44; // where the picture and the quest plate start
const LEFT_W = 62; // the giver's picture column
const RIGHT_X = 84; // where the quest side starts
const RIGHT_W = WIDTH - RIGHT_X - 12;
const STEPS_TOP = 68;
const STEPS_BOTTOM = 113;
const STEP_TEXT_X = RIGHT_X + 16;
const STEP_WRAP = RIGHT_W - 16;
const LINE = 10;
const GAP = 4;
const ICON_ROW = 18;

/** A small square tab showing the face of whoever gave a quest. */
class QuestTab extends Phaser.GameObjects.Container {
  constructor(scene, x, y, face, onPress) {
    super(scene, x, y);
    this.bw = TAB;
    this.bh = TAB;
    this.onPress = onPress;
    this.selected = false;
    this.box = uiBox(scene, 'button', 0, 0, TAB, TAB);
    this.add(this.box);
    if (face) this.add(scene.add.image(TAB / 2, TAB / 2 - 1, face.tex, face.frame).setDisplaySize(16, 16));
    this.focusCorners = new FocusCorners(scene);
    this.add(this.focusCorners);
    this.hit = scene.add.zone(TAB / 2, TAB / 2, TAB, TAB).setInteractive({ useHandCursor: true });
    this.add(this.hit);
    this.hit.on('pointerup', () => this.activate());
    scene.add.existing(this);
  }

  setSelected(on) {
    this.selected = on;
    this.box.setTint(on ? 0xcdeaa0 : 0xffffff);
    this.setY(on ? TAB_Y + 1 : TAB_Y);
  }

  setFocus(on) {
    if (on) this.focusCorners.around(0, 0, TAB, TAB);
    else this.focusCorners.setVisible(false);
  }

  activate() {
    this.scene.registry.get('audio')?.play('page', { volume: 0.8, vary: 0.4 });
    this.onPress();
  }
}

/**
 * The quest journal. Each quest started so far has a tab showing the face of whoever gave it.
 * The page shows that face in a wooden frame, the quest's name, the steps reached so far
 * (a tick for finished steps, > for the one you are on; "find N things" steps show a row of
 * little pictures that fill in as you find them) and the reward. The last tab is the favourite
 * treats page: every friend and their favourite treat, once you have found it out.
 */
export class JournalPanel extends Modal {
  constructor(ui, opts = {}) {
    super(ui, { width: WIDTH, height: HEIGHT, title: words(ui, 'journal.title'), accent: 'green', ...opts });
    this.entries = ui.session.rules.journal();
    this.index = 0;
    this.colors = ui.content.art.ui.colors;

    this.ok = new UiButton(ui, 0, 132, { label: words(ui, 'settings.close'), selectedMark: false, onPress: () => this.close() });
    this.ok.setX(Math.floor((WIDTH - this.ok.bw) / 2));
    this.root.add(this.ok);

    // The last tab is the favourite treats page (everyone with a favourite, "?" until you find out).
    this.friends = ui.session.rules.favourites();
    const pages = this.entries.length ? [...this.entries] : [{ kind: 'empty' }];
    if (this.friends.length) pages.push({ kind: 'treats' });
    this.pages = pages;
    if (pages.length === 1 && pages[0].kind === 'empty') {
      this.showEmpty(this.root);
      this.setFocusRows([[this.ok]]);
      return;
    }

    this.tabs = pages.map((page, i) => {
      const face = page.kind === 'treats' ? iconFor(ui, 'food-cake') : page.kind === 'empty' ? piece(ui, 'starSmall') : portraitFor(ui, page.giver.portrait) || iconFor(ui, page.icon);
      const tab = new QuestTab(ui, 12 + i * (TAB + 2), TAB_Y, face, () => this.select(i));
      this.root.add(tab);
      return tab;
    });
    this.render();
    this.setFocusRows([this.tabs.length > 1 ? this.tabs : [], [this.ok]]);
  }

  /** No quests yet: the hero marches under a thought bubble with a question mark. */
  showEmpty(into) {
    const ui = this.ui;
    const bubble = uiBox(ui, 'speech', 0, 0, 44, 34);
    const mark = uiText(ui, 0, 0, '?', { font: 'big', color: this.colors.ink });
    bubble.setPosition(WIDTH / 2 + 14, 40);
    mark.setPosition(WIDTH / 2 + 14 + Math.floor((44 - mark.width) / 2) + 2, 50);
    into.add([bubble, mark]);
    addHero(ui, into, WIDTH / 2 - 12, 98);
    const empty = uiText(ui, 0, 106, words(ui, 'journal.empty'), { color: this.colors.ink, wrap: 240, align: 'center' });
    empty.setX(Math.floor((WIDTH - empty.width) / 2));
    into.add(empty);
  }

  /**
   * Favourite treats: three columns of friends, each with their treat's picture (a "?" until a
   * hint or a shared favourite tells you) and a tick once they have had it.
   */
  drawTreats(body) {
    const ui = this.ui;
    const help = uiText(ui, 0, TOP - 2, words(ui, 'journal.treats'), { color: this.colors.inkSoft });
    help.setX(Math.floor((WIDTH - help.width) / 2));
    body.add(help);
    const colW = Math.floor((WIDTH - 24) / 3);
    const rowH = 12;
    const rows = Math.ceil(this.friends.length / 3);
    this.friends.forEach((friend, i) => {
      const x = 12 + Math.floor(i / rows) * colW;
      const y = TOP + 12 + (i % rows) * rowH;
      const icon = friend.treat ? iconFor(ui, friend.treat) : null;
      if (icon) body.add(ui.add.image(x + 6, y + 5, icon.tex, icon.frame).setDisplaySize(12, 12));
      else body.add(uiText(ui, x + 3, y + 1, '?', { color: this.colors.inkSoft }));
      const name = uiText(ui, x + 15, y + 1, friend.name, { color: friend.treat ? this.colors.ink : this.colors.inkSoft });
      body.add(name);
      if (friend.had) {
        const tick = piece(ui, 'tick');
        body.add(ui.add.image(x + 16 + name.width, y + 5, tick.tex, tick.frame).setOrigin(0, 0.5));
      }
    });
  }

  /** The sign on top says "Quests" or, on the last tab, "Treats". */
  setPlaque(treats) {
    if (this.plaqueTreats === treats) return;
    this.plaqueTreats = treats;
    this.plaque?.destroy();
    this.plaque = addPlaque(this.ui, this.root, WIDTH, words(this.ui, treats ? 'journal.treatsTitle' : 'journal.title'), treats ? 'gold' : 'green');
  }

  select(index) {
    if (index === this.index) return;
    this.index = index;
    this.render();
  }

  render() {
    const ui = this.ui;
    this.tabs.forEach((tab, i) => tab.setSelected(i === this.index));
    this.body?.destroy();
    const body = ui.add.container(0, 0);
    this.body = body;
    this.root.add(body);
    const entry = this.pages[this.index];
    this.setPlaque(entry.kind === 'treats');
    if (entry.kind === 'treats') return this.drawTreats(body);
    if (entry.kind === 'empty') return this.showEmpty(body);

    this.drawGiver(body, entry);
    this.drawTitle(body, entry);
    this.drawSteps(body, entry);
    this.drawReward(body, entry);
  }

  /** The giver's face in the wooden frame, and their name underneath. */
  drawGiver(body, entry) {
    const ui = this.ui;
    const frame = piece(ui, 'portraitFrame');
    const fx = Math.floor((LEFT_W - 58) / 2) + 10;
    body.add(ui.add.image(fx, TOP, frame.tex, frame.frame).setOrigin(0, 0));
    const face = portraitFor(ui, entry.giver.portrait) || iconFor(ui, entry.icon);
    if (face) {
      const image = ui.add.image(fx + 29, TOP + 28, face.tex, face.frame).setDisplaySize(32, 32);
      body.add(image);
      if (!ui.session.settings.reducedMotion) {
        ui.tweens.add({ targets: image, y: image.y - 1, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    }
    if (entry.giver.name) {
      const name = uiText(ui, 0, TOP + 61, entry.giver.name, { color: this.colors.ink, wrap: LEFT_W + 8, align: 'center' });
      name.setX(fx + 29 - Math.floor(name.width / 2));
      body.add(name);
    }
  }

  /** The quest's name on a cream plate, with a tick when it is finished. */
  drawTitle(body, entry) {
    const ui = this.ui;
    const plate = uiBox(ui, 'button', RIGHT_X, TOP, RIGHT_W, 20);
    plate.setTint(entry.done ? 0xffe89a : 0xffffff);
    body.add(plate);
    const title = uiText(ui, 0, TOP + 5, entry.title, { color: this.colors.ink, wrap: RIGHT_W - 28, align: 'center' });
    let x = RIGHT_X + Math.floor((RIGHT_W - title.width) / 2);
    if (entry.done) {
      const tick = piece(ui, 'check');
      x += 8;
      body.add(ui.add.image(x - 18, TOP + 1, tick.tex, tick.frame).setOrigin(0, 0));
    }
    title.setX(x);
    body.add(title);
  }

  /** Steps, newest last. If there are too many for the space, the oldest are left out. */
  drawSteps(body, entry) {
    const ui = this.ui;
    const rows = entry.steps.map((step) => {
      const text = uiText(ui, STEP_TEXT_X, 0, step.text, { color: step.state === 'done' ? this.colors.inkSoft : this.colors.ink, wrap: STEP_WRAP });
      const lines = text.getWrappedText(text.text).length;
      // A row of little pictures that fill in: one per thing to bring, or the step's icon once per thing to find.
      const list = step.icons || (step.need > 1 && step.icon ? Array.from({ length: step.need }, (_, i) => ({ icon: step.icon, got: i < step.have })) : []);
      const icons = list.length ? list : null;
      return { step, text, icons, height: lines * LINE + (icons ? ICON_ROW : 0) + GAP };
    });
    let total = rows.reduce((sum, r) => sum + r.height, 0);
    while (total > STEPS_BOTTOM - STEPS_TOP && rows.length > 1) {
      const dropped = rows.shift();
      dropped.text.destroy();
      total -= dropped.height;
    }
    let y = STEPS_TOP;
    for (const row of rows) {
      row.text.setY(y);
      body.add(row.text);
      if (row.step.state === 'done') {
        const tick = piece(ui, 'tick');
        body.add(ui.add.image(RIGHT_X, y - 3, tick.tex, tick.frame).setOrigin(0, 0));
      } else {
        body.add(uiText(ui, RIGHT_X + 3, y, '>', { color: this.colors.ink }));
      }
      y += row.text.getWrappedText(row.text.text).length * LINE;
      if (row.icons) {
        row.icons.forEach((entry, i) => {
          const icon = iconFor(ui, entry.icon);
          if (!icon) return;
          const image = ui.add.image(STEP_TEXT_X + i * 18, y + 1, icon.tex, icon.frame).setOrigin(0, 0);
          if (!entry.got) image.setTint(0x000000).setTintMode(Phaser.TintModes.FILL).setAlpha(0.3);
          body.add(image);
        });
        y += ICON_ROW;
      }
      y += GAP;
    }
  }

  /** The reward: small star, heart and coin pictures with amounts, or nothing for a quest with none. */
  drawReward(body, entry) {
    const ui = this.ui;
    const reward = entry.reward;
    if (!reward) return;
    const parts = [];
    if (reward.stars) parts.push([piece(ui, 'starSmall'), reward.stars]);
    if (reward.hearts) parts.push([piece(ui, 'heart'), reward.hearts]);
    if (reward.coins) parts.push([piece(ui, 'coin'), reward.coins]);
    for (const [id, count] of Object.entries(reward.items || {})) {
      const icon = iconFor(ui, id);
      if (icon) parts.push([icon, count]);
    }
    if (!parts.length) return;
    let x = RIGHT_X;
    const y = 114;
    body.add(uiText(ui, x, y + 4, words(ui, 'journal.reward'), { color: this.colors.inkSoft }));
    x += 46;
    for (const [icon, count] of parts) {
      body.add(ui.add.image(x, y, icon.tex, icon.frame).setOrigin(0, 0));
      const amount = uiText(ui, x + 17, y + 4, `x${count}`, { color: this.colors.ink });
      body.add(amount);
      x += 17 + amount.width + 8;
    }
  }
}
